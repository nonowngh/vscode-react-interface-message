import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Checkbox, Paper, MenuItem,
  CircularProgress, Typography, Box, Collapse, IconButton, Divider // Divider 추가 확인
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage'; // SQL 아이콘
import { DataGrid } from '@mui/x-data-grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add'; // 추가
import DeleteIcon from '@mui/icons-material/Delete'; // 추가
import { interfaceApi } from '../api/interfaceApi';

const InterfaceDialog = ({ open, data, onClose, onSave }) => {
  const initialFormState = {
    interfaceId: '', interfaceName: '', patternType: '', patternName: '',
    interfaceType: '', interfaceTypeName: '', cronExpression: '',
    sendSystemCode: '', recvSystemCode: '', useYn: 'N'
  };

  // SQL 관련 상태 확장
  const [showSqlPanel, setShowSqlPanel] = useState(false);
  const [sqlList, setSqlList] = useState([]); // [{id: 1, sqlId: '', sqlContent: ''}]
  const [currentSql, setCurrentSql] = useState({ sqlId: '', sqlContent: '' });
  const [editingId, setEditingId] = useState(null); // 🏆 현재 수정 중인 항목의 ID

  const [formData, setFormData] = useState(initialFormState);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailRows, setDetailRows] = useState([]);

  // 데이터 로드 시 초기화
  useEffect(() => {
    if (open) {
      setSqlList(data?.sqls || []); // 기존 저장된 SQL 목록이 있다면 로드
      setCurrentSql({ sqlId: '', sqlContent: '' });
    }
  }, [open, data]);

  // 목록에서 SQL 선택 시 수정 모드로 전환
  const handleSelectSql = (item) => {
    setEditingId(item.id);
    setCurrentSql({ sqlId: item.sqlId, sqlContent: item.sqlContent });
  };

  // SQL 목록에 추가 (임시 저장)
  const handleAddSql = () => {
    if (!currentSql.sqlId || !currentSql.sqlContent) {
      alert("SQL ID와 Query를 모두 입력해주세요.");
      return;
    }
    setSqlList(prev => [...prev, { ...currentSql, id: Date.now() }]);
    setCurrentSql({ sqlId: '', sqlContent: '' }); // 입력창 초기화
  };

  // SQL 추가 또는 수정 완료
  const handleAddOrUpdateSql = () => {
    if (!currentSql.sqlId || !currentSql.sqlContent) {
      alert("SQL ID와 Query를 모두 입력해주세요.");
      return;
    }

    if (editingId) {
      // 🔄 수정 모드: 기존 목록에서 ID가 일치하는 항목을 찾아 업데이트
      setSqlList(prev => prev.map(item =>
        item.id === editingId ? { ...currentSql, id: editingId } : item
      ));
      setEditingId(null); // 수정 완료 후 초기화
    } else {
      // ➕ 신규 추가 모드
      setSqlList(prev => [...prev, { ...currentSql, id: Date.now() }]);
    }

    setCurrentSql({ sqlId: '', sqlContent: '' }); // 입력창 비우기
  };

  // 수정 취소 (입력창 비우기)
  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentSql({ sqlId: '', sqlContent: '' });
  };

  // 삭제 로직 (수정 중인 항목 삭제 시 에디터 초기화 포함)
  const handleDeleteSql = (e, item) => {
    e.stopPropagation();
    if (window.confirm(`SQL ID: '${item.sqlId}' 항목을 삭제하시겠습니까?`)) {
      setSqlList(prev => prev.filter(sql => sql.id !== item.id));
      if (editingId === item.id) handleCancelEdit();
    }
  };

  // SQL 패널 최종 저장 및 닫기
  const handleSqlPanelSave = () => {
    // 현재 입력창에 남아있는 내용이 있다면 자동 추가할지 물어보거나 무시
    setShowSqlPanel(false);
  };

  // 행 추가 로직
  const handleAddRow = () => {
    const newRow = {
      id: Date.now(),
      configKey: '',
      configValue: '',
      isNew: true, // 👈 신규 행임을 표시
    };
    setDetailRows((prev) => [newRow, ...prev]); // 👈 위에 추가되게 변경 (더 잘 보임)
    if (!showDetail) setShowDetail(true);
  };

  // 행 삭제 로직
  const handleDeleteRow = useCallback((id, configKey) => {
  const displayName = configKey?.trim() || "이름 없는 항목";
  if (window.confirm(`'${displayName}' 설정을 삭제하시겠습니까?`)) {
    setDetailRows((prev) => prev.filter((row) => row.id !== id));
  }
}, []);

  // 상세 설정 컬럼 정의 (삭제 버튼 렌더링 포함)
  const detailColumns = useMemo(() => [
    { field: 'configKey', headerName: '설정 항목 (Key)', flex: 1, editable: true },
    { field: 'configValue', headerName: '설정 값 (Value)', flex: 1.5, editable: true },
    {
      field: 'actions',
      headerName: '삭제',
      width: 70,
      sortable: false,
      renderCell: (params) => (
      <IconButton 
        color="error" 
        size="small" 
        // 👈 params.row.configKey 라고 정확히 명시해야 합니다.
        onClick={() => handleDeleteRow(params.id, params.row.configKey)}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    ),
    },
  ], []);

  const fetchPatterns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interfaceApi.fetchPatterns();
      const patternData = Array.isArray(response.data) ? response.data : response.data.list || [];
      setPatterns(patternData);
    } catch (error) {
      console.error("패턴 목록 로드 실패:", error);
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPatterns();
      setFormData(data || initialFormState);
      setDetailRows(data?.details || []);
      setShowDetail(false);
    }
  }, [open, data, fetchPatterns]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked ? 'Y' : 'N' }));
      return;
    }
    if (name === 'patternType') {
      const selected = patterns.find(opt => opt.patternCode === value);
      const isBatch = selected?.interfaceTypeName === '배치';
      setFormData(prev => ({
        ...prev, patternType: value, patternName: selected?.patternName || '',
        interfaceType: selected?.interfaceType || '', interfaceTypeName: selected?.interfaceTypeName || '',
        cronExpression: isBatch ? prev.cronExpression : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const processRowUpdate = (newRow) => {
    const updatedRows = detailRows.map((row) => (row.id === newRow.id ? newRow : row));
    setDetailRows(updatedRows);
    return newRow;
  };

  const handleSave = () => {
    // 1. 빈 행(Key 또는 Value가 없는 행)이 있는지 확인
  const hasEmptyRow = detailRows.some(
    row => !row.configKey?.trim() || !row.configValue?.trim()
  );
  // 2. 상세 설정이 하나라도 있는데 빈 값이 있는 경우 차단
  if (hasEmptyRow) {
    alert("상세 설정의 '설정 항목'과 '설정 값'을 모두 입력해주세요.");
    return; // 저장 프로세스 중단
  }
    // configKey가 있는 유효한 행만 필터링하여 저장 가능 (선택 사항)
    if (window.confirm("입력하신 내용을 저장하시겠습니까?")) {
    onSave({ 
      ...formData, 
      details: detailRows // 이미 위에서 검증했으므로 그대로 전달
    });
  }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={showSqlPanel ? "lg" : "md"} scroll="paper" >
      <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee', display: 'flex', color: '#07498b', justifyContent: 'space-between', alignItems: 'center' }}>
        {data?.interfaceId ? "📖 인터페이스 상세 및 수정" : "➕ 신규 인터페이스 등록"}
        {loading && <CircularProgress size={24} />}
      </DialogTitle>

      <DialogContent dividers>
        {/* 🏆 핵심 수정: 좌/우를 가르는 가로 Stack 생성 */}
        <Stack direction="row" spacing={showSqlPanel ? 3 : 0} sx={{ minHeight: 350 }}>

          {/* [좌측 영역] - flex: 1로 고정 */}
          <Box sx={{
            // 패널이 열리면 전체의 50%를 차지하고, 닫히면 100%를 차지하게 설정
            flex: showSqlPanel ? '0 0 50%' : '1 1 auto',
            transition: 'flex 0.3s ease-in-out', // 부드러운 확장/축소 효과
            overflow: 'hidden' // 내용이 넘쳐서 레이아웃 깨짐 방지
          }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2}>
                <TextField label="인터페이스 ID" name="interfaceId" value={formData.interfaceId} onChange={handleChange} fullWidth required disabled={!!data?.interfaceId} />
                <TextField label="인터페이스 명" name="interfaceName" value={formData.interfaceName} onChange={handleChange} fullWidth required />
              </Stack>

              <Stack direction="row" spacing={2} >
                <TextField select label="연계 패턴" name="patternType" value={formData.patternType} onChange={handleChange} fullWidth required disabled={loading}>
                  <MenuItem value=""><em>--- 패턴 선택 ---</em></MenuItem>
                  {patterns.map((opt) => (
                    <MenuItem key={opt.patternCode} value={opt.patternCode}>{opt.patternName} ({opt.patternCode})</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="연계 유형"
                  value={formData.interfaceTypeName}
                  fullWidth
                  placeholder="패턴 선택 시 자동 매핑" // 💡 여기에 텍스트 배치
                  InputProps={{ readOnly: true, sx: { backgroundColor: 'rgba(0, 0, 0, 0.05)' } }}
                  variant="filled"
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField label="송신 시스템 코드" name="sendSystemCode" value={formData.sendSystemCode} onChange={handleChange} fullWidth />
                <TextField label="수신 시스템 코드" name="recvSystemCode" value={formData.recvSystemCode} onChange={handleChange} fullWidth />
              </Stack>

              {/* Cron 주기 및 SQL 등록 버튼 */}
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label="Cron 주기 (스케줄)"
                  name="cronExpression"
                  value={formData.cronExpression}
                  onChange={handleChange}
                  fullWidth
                  // 도움말 대신 placeholder를 활용하여 공간을 비웁니다.
                  placeholder="예: 0 0/5 * * * ?"
                  disabled={formData.interfaceTypeName !== '배치'}
                  // helperText를 제거하거나 빈 공간을 줍니다.
                  sx={{ flex: 1.08 }}
                />
                <Button
                  variant={showSqlPanel ? "contained" : "outlined"}
                  color="secondary"
                  startIcon={<StorageIcon />}
                  onClick={() => setShowSqlPanel(!showSqlPanel)}
                  sx={{ height: '56px', flex: 1, fontWeight: 'bold' }}
                >
                  {showSqlPanel ? "SQL 설정 닫기" : "SQL 등록/수정"}
                </Button>
              </Stack>

              {/* 상세 설정 섹션 */}
              <Box sx={{ mt: 0.1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color={showDetail ? "inherit" : "success"}
                  onClick={() => setShowDetail(!showDetail)}
                  startIcon={showDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ py: 1, borderWidth: 2, fontWeight: 'bold', mb: showDetail ? 1 : 0 }}
                >
                  {formData.patternName ? `${formData.patternName} 상세 설정 ` : "인터페이스 상세 설정 "}
                  {showDetail ? "숨기기" : "보기"} ({detailRows.length})
                </Button>

                <Collapse in={showDetail}>
                  <Box sx={{ pt: 1.5, pb: 0.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>⚙️ 상세 설정 리스트</Typography>
                      <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddRow} size="small">설정 추가</Button>
                    </Stack>
                    <Paper elevation={0} sx={{ height: 200, border: '1px solid #1d0ea8', borderRadius: 1, overflow: 'hidden' }}>
                      <DataGrid rows={detailRows} columns={detailColumns} rowHeight={43} columnHeaderHeight={47} hideFooter density="compact" processRowUpdate={processRowUpdate}
                        getRowClassName={(params) => params.row.isNew ? 'new-row-highlight' : ''}
                        sx={{
                          height: 200,
                          '& .MuiDataGrid-cell': {
                            fontSize: '0.8rem',  // 👈 글자 크기도 살짝 줄여야 답답하지 않습니다
                          },
                          // ⬇️ 헤더 전체 배경색 및 텍스트 설정
                          border: '1px solid #e0e0e0',
                          // 1. 헤더 스타일 (이전 가이드)
                          '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#f8f9fa',
                            borderBottom: '2px solid #dee2e6',
                          },
                          // 2. 줄무늬 스타일 (짝수 행에 배경색 부여)
                          '& .MuiDataGrid-row:nth-of-type(even)': {
                            backgroundColor: '#f2f7ff', // 아주 연한 블루 혹은 #fafafa (연한 회색)
                          },
                          // 3. 마우스 올렸을 때 하이라이트 (선택 사항)
                          '& .MuiDataGrid-row:hover': {
                            backgroundColor: '#e3edfd !important',
                            cursor: 'pointer',
                          },
                          // 4. 기존 신규 행 하이라이트와 공존시키기
                          '& .new-row-highlight': {
                            backgroundColor: '#dff0d8 !important', // 신규 행은 줄무늬보다 우선순위 높게
                            fontWeight: 'bold',
                          },
                          // 셀 테두리 정리
                          '& .MuiDataGrid-cell': {
                            borderBottom: '1px solid #f0f0f0',
                          },
                          // ⬇️ 개별 헤더 셀 내부 스타일 (구분선 등)
                          '& .MuiDataGrid-columnHeaderTitle': {
                            fontWeight: 'bold',
                            color: '#1a237e',           // 제목 색상을 포인트 컬러로 (예: 남색)
                          },
                        }} />
                    </Paper>
                  </Box>
                </Collapse>
              </Box>
            </Stack>
          </Box>

          {/* [우측 영역]: SQL 관리 패널 */}
          {showSqlPanel && (
            <Stack direction="row" sx={{ flex: 1.0 }}>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} /> {/* 간격 살짝 확대 */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* 1. 제목 마진 최소화 */}
                <Typography variant="subtitle2" sx={{ mb: 0.2, fontWeight: 'bold', color: '#7b1fa2' }}>
                  🖥️ SQL 설정 {editingId ? "(수정 중)" : "(신규 등록)"}
                </Typography>

                {/* 2. 입력 폼 컴팩트화 */}
                <Paper variant="outlined" sx={{ p: 1.0, mb: 1.0, bgcolor: editingId ? '#fffde7' : '#fbfaff', transition: '0.3s' }}>
                  <Stack spacing={0}>
                    <TextField
                      label="SQL ID" size="small" fullWidth
                      value={currentSql.sqlId}
                      onChange={(e) => setCurrentSql({ ...currentSql, sqlId: e.target.value })}
                      sx={{
                        '& .MuiInputBase-input': {
                          py: 0.5, // 위아래 패딩을 줄임 (기본값보다 훨씬 슬림해짐)
                          fontSize: '0.9rem', // 폰트 크기를 살짝 줄임
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.9rem', // 라벨(제목) 크기도 맞춤
                          top: -3.5, // 라벨 위치 미세 조정
                        }
                      }}
                    />
                    <Box>
                      <TextField
                        label="SQL Query"
                        multiline
                        rows={8} // 💡 8줄에서 5줄로 줄여서 위쪽 공간 확보
                        // maxRows={8} // 내용이 많아지면 8줄까지는 유동적으로 늘어남
                        fullWidth
                        value={currentSql.sqlContent}
                        onChange={(e) => setCurrentSql({ ...currentSql, sqlContent: e.target.value })}
                        placeholder="SELECT * FROM TABLE WHERE ID = :id (JdbcTemplate 형식)"
                        sx={{
                          mt: 1.5,
                          minHeight: '180px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          border: '1px solid #eee',
                          '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.7rem' },
                          bgcolor: '#fff',
                          mb: 0
                        }}
                      />
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Button
                        variant="contained"
                        size="small" // 💡 버튼 크기 축소
                        color={editingId ? "warning" : "primary"}
                        fullWidth
                        onClick={handleAddOrUpdateSql}
                        sx={{ py: 0.5 }}
                      >
                        {editingId ? "수정 완료" : "목록에 추가"}
                      </Button>
                      {editingId && (
                        <Button variant="outlined" size="small" sx={{ py: 0.2 }} color="inherit" onClick={handleCancelEdit}>취소</Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>

                {/* 3. 목록 영역 높이 현실화 및 여백 제거 */}
                <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 0.1, display: 'block' }}>
                  목록 (총 {sqlList.length}건)
                </Typography>

                <Box sx={{
                  // 💡 30px는 너무 작으므로 150px~180px 정도로 설정하여 안정감 확보
                  flex: 1,
                  minHeight: '120px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid #eee',
                  borderRadius: 1,
                  bgcolor: '#fafafa',
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-thumb': { backgroundColor: '#ccc', borderRadius: '2px' }
                }}>
                  {sqlList.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2, fontSize: '0.8rem' }}>
                      등록된 SQL이 없습니다.
                    </Typography>
                  ) : (
                    sqlList.map((item) => (
                      <Box
                        key={item.id}
                        onClick={() => handleSelectSql(item)}
                        sx={{
                          px: 1,
                          py: 0.2,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          bgcolor: editingId === item.id ? '#ca6864' : 'transparent',
                          minHeight: '28px',
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                      >
                        <Typography variant="body2" sx={{
                          fontSize: '0.75rem',
                          fontWeight: editingId === item.id ? 'bold' : 'normal',
                          color: editingId === item.id ? '#fff' : 'inherit', // 배경이 어두우면 글자를 흰색으로
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '85%'
                        }}>
                          {item.sqlId}
                        </Typography>
                        <IconButton
                          size="small"
                          sx={{ color: editingId === item.id ? '#fff' : 'error.main', p: 0.2 }}
                          onClick={(e) => handleDeleteSql(e, item)} // 👈 item 객체 전체를 전달
                        >
                          <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 4, borderTop: '1px solid #eee', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Checkbox checked={formData.useYn === 'Y'} onChange={handleChange} name="useYn" color="primary" />
          <Typography variant="body2" sx={{ cursor: 'pointer' }} onClick={() => setFormData(prev => ({ ...prev, useYn: prev.useYn === 'Y' ? 'N' : 'Y' }))}>사용 여부</Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button onClick={onClose} color="inherit" variant="outlined">취소</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.interfaceId || !formData.patternType} sx={{ px: 4 }}>저장하기</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default InterfaceDialog;