import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, Checkbox, Paper, MenuItem,
  CircularProgress, Typography, Box, Collapse, IconButton, Divider, Chip // Divider 추가 확인
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage'; // SQL 아이콘
import { DataGrid } from '@mui/x-data-grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add'; // 추가
import DeleteIcon from '@mui/icons-material/Delete'; // 추가
import { interfaceApi } from '../api/interfaceApi';

const InterfaceDialog = ({ open, data, rows = [], onClose, onSave }) => {
  const initialFormState = {
    interfaceId: '', interfaceName: '', patternType: '', patternName: '',
    interfaceType: '', interfaceTypeName: '', cronExpression: '',
    sendSystemCode: '', recvSystemCode: '', useYn: 'N'
  };

  // SQL 관련 상태 확장
  const [showSqlPanel, setShowSqlPanel] = useState(false);
  const [sqlList, setSqlList] = useState([]); // [{id: 1, sqlId: '', sqlContent: ''}]
  const [currentSql, setCurrentSql] = useState({ sqlId: '', sqlContent: '', sqlType: 'SELECT' });
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
    setCurrentSql({ sqlId: item.sqlId, sqlType: item.sqlType, sqlContent: item.sqlContent });
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
    if (!currentSql.sqlId || !currentSql.sqlContent || !currentSql.sqlType) {
      alert("SQL ID, 유형, Query를 모두 입력해주세요.");
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
      interfaceId: formData.interfaceId, // interfaceId 포함
      patternCode: formData.patternType,  // patternCode 포함
      propertyName: '',                  // 필드명 변경
      propertyValue: '',                 // 필드명 변경
      isNew: true,
    };
    setDetailRows((prev) => [newRow, ...prev]);
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
    {
      field: 'propertyName', // configKey -> propertyName
      headerName: '설정 항목 (Key)',
      flex: 1,
      editable: true
    },
    {
      field: 'propertyValue', // configValue -> propertyValue
      headerName: '설정 값 (Value)',
      flex: 1.5,
      editable: true
    },
    {
      field: 'actions',
      headerName: '삭제',
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
          onClick={() => handleDeleteRow(params.id, params.row.propertyName)} // propertyName 참조
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ], []);

  // 1. 현재 선택된 패턴에서 이미 사용 중인 Key들을 중복 없이 추출
  const existingKeysByPattern = useMemo(() => {
    if (!formData.patternType || !rows) return [];
    // 전체 데이터(rows) 중 현재 패턴과 같은 것들의 키만 수집
    const keys = rows
      .filter(r => r.patternType === formData.patternType)
      .flatMap(r => r.properties || [])
      .map(p => p.propertyName)
      .filter(Boolean);
    return [...new Set(keys)].sort();
  }, [formData.patternType, rows]);

  const handleAddSampleKey = (key) => {
    // 이미 그리드에 해당 키가 있는지 체크 (중복 방지)
    const isExist = detailRows.some(row => row.propertyName === key);
    if (isExist) {
      alert("이미 추가된 항목입니다.");
      return;
    }
    const newRow = {
      id: `new-${Date.now()}`, // 중복되지 않는 ID 생성
      propertyName: key,
      propertyValue: '',
      isNew: true
    };
    setDetailRows(prev => [newRow, ...prev]);
  };

  const [templateKeys, setTemplateKeys] = useState([]);
  useEffect(() => {
    const fetchKeys = async () => {
      if (!formData.patternType) {
        setTemplateKeys([]);
        return;
      }
      try {
        // API 응답이 ["masterTable", "viewTable"] 형태라고 가정
        const response = await interfaceApi.fetchTemplateKeys(formData.patternType);
        setTemplateKeys(response.data || []);
      } catch (err) {
        console.error("키 목록 로드 실패:", err);
        setTemplateKeys([]);
      }
    };
    if (open) { // 다이얼로그가 열려있을 때만 호출
      fetchKeys();
    }
  }, [formData.patternType, open]);

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
  if (open && data) {
    fetchPatterns();
    setFormData(data || initialFormState);
    // 1. 프로퍼티 설정 매핑
    const mappedDetails = (data?.properties || []).map((p, index) => ({
      ...p,
      id: p.id || `prop-${index}-${Date.now()}`
    }));
    setDetailRows(mappedDetails);
    // 2. SQL 정보 매핑 (핵심 수정 부분)
    // 백엔드: { sqlId, sqlType, sqlQuery }
    // 프론트엔드: { sqlId, sqlType, sqlContent } <- UI에서 sqlContent를 쓰고 있다면!
    const mappedSqls = (data?.sqls || []).map((s, index) => ({
      id: s.id || `${s.sqlId}-${index}-${Date.now()}`, 
      interfaceId: s.interfaceId,
      sqlId: s.sqlId,
      sqlType: s.sqlType ? s.sqlType.toUpperCase() : 'SELECT',
      sqlContent: s.sqlQuery
    }));
    setSqlList(mappedSqls);
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

  // SQL 유형 변경 시 ID 자동 생성 핸들러
  const handleSqlTypeChange = (e) => {
    const selectedType = e.target.value;
    setCurrentSql(prev => {
      // 1. 현재 ID가 비어있거나
      // 2. 현재 ID가 '인터페이스ID.'으로 시작하는 자동생성 규칙을 따르고 있다면 덮어쓰기
      const shouldUpdateId = !prev.sqlId || prev.sqlId.startsWith(`${formData.interfaceId}.`);
      return {
        ...prev,
        sqlType: selectedType,
        sqlId: shouldUpdateId ? `${formData.interfaceId}.${selectedType}` : prev.sqlId
      };
    });
  };

  const handleUpdateSql = () => {
  if (!currentSql.sqlId || !currentSql.sqlContent) {
    alert("SQL ID와 내용을 모두 입력해주세요.");
    return;
  }
  // sqlList에서 현재 수정 중인 ID와 일치하는 항목을 찾아 교체
  setSqlList(prev => prev.map(item => 
    item.id === editingId ? { ...currentSql, id: editingId } : item
  ));
  // 입력창 초기화 및 수정 모드 종료
  setEditingId(null);
  setCurrentSql({ 
    sqlId: `${formData.interfaceId}.`, 
    sqlType: 'SELECT', 
    sqlContent: '' 
  });
};

  const processRowUpdate = (newRow) => {
    const updatedRows = detailRows.map((row) => (row.id === newRow.id ? newRow : row));
    setDetailRows(updatedRows);
    return newRow;
  };

  const handleSave = () => {
  // 1. 빈 행 검증
  const hasEmptyRow = detailRows.some(
    row => !row.propertyName?.trim() || !row.propertyValue?.trim()
  );

  if (hasEmptyRow) {
    alert("상세 설정의 '설정 항목'과 '설정 값'을 모두 입력해주세요.");
    return;
  }

  if (window.confirm("입력하신 내용을 저장하시겠습니까?")) {
    onSave({
      ...formData,
      // 설정 정보 매핑
      properties: detailRows.map(row => ({
        interfaceId: formData.interfaceId,
        patternCode: formData.patternType, // 👈 이 줄이 추가되어야 합니다!
        propertyName: row.propertyName,
        propertyValue: row.propertyValue
      })),
      // SQL 정보 매핑
      sqls: sqlList.map(sql => ({
        interfaceId: formData.interfaceId,
        patternCode: formData.patternType, // 👈 SQL 테이블에도 pattern_code가 있다면 넣어주는 것이 안전합니다.
        sqlId: sql.sqlId,
        sqlType: sql.sqlType,
        sqlQuery: sql.sqlContent 
      }))
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
        <Stack direction="row" spacing={showSqlPanel ? 3 : 0} sx={{ minHeight: 300 }}>

          {/* [좌측 영역] - flex: 1로 고정 */}
          <Box sx={{
            // 패널이 열리면 전체의 50%를 차지하고, 닫히면 100%를 차지하게 설정
            flex: showSqlPanel ? '0 0 60%' : '1 1 auto',
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
                    {/* 헤더 부분: 타이틀과 버튼 */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        ⚙️ 상세 설정 및 참조 항목
                      </Typography>
                      <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddRow} size="small">
                        설정 직접 추가
                      </Button>
                    </Stack>
                    {/* 좌우 분할 구역 */}
                    <Stack direction="row" spacing={2} sx={{ height: 250 }}>

                      {/* [왼쪽] 해당 패턴(P01 등)에서 이미 사용 중인 키 목록 */}
                      <Paper
                        variant="outlined"
                        sx={{
                          flex: '0 0 220px', // 왼쪽 너비 고정
                          bgcolor: '#f8f9fa',
                          display: 'flex',
                          flexDirection: 'column',
                          border: '1px solid #e0e0e0',
                          borderRadius: 1
                        }}
                      >
                        <Box sx={{ p: 1, borderBottom: '1px solid #eee', bgcolor: '#f1f3f4' }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1a5f7a' }}>
                            📋 {formData.patternType} 사용 중인 키 (참조)
                          </Typography>
                        </Box>

                        <Box sx={{
                          p: 1, overflowY: 'auto', flex: 1, '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            backgroundColor: '#cfd8dc',
                            borderRadius: '10px',
                          },
                          '&::-webkit-scrollbar-track': {
                            backgroundColor: 'transparent',
                          }
                        }}>
                          {templateKeys.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                              참조할 키가 없습니다.
                            </Typography>
                          ) : (
                            <Stack spacing={0.6}>
                              {templateKeys.map((key) => (
                                <Chip
                                  key={key}
                                  label={key}
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleAddSampleKey(key)} // 클릭 시 우측 그리드에 추가
                                  sx={{
                                    justifyContent: 'flex-start',
                                    fontSize: '0.75rem',
                                    height: '26px',
                                    borderColor: '#cfe2ff',
                                    bgcolor: '#fff',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#e7f0ff', borderColor: '#0d6efd' }
                                  }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Paper>{/* [오른쪽] 기존 DataGrid 영역 */}
                      <Paper elevation={0} sx={{ flex: 1, border: '1px solid #1d0ea8', borderRadius: 1, overflow: 'hidden' }}>
                        <DataGrid
                          rows={detailRows}
                          columns={detailColumns}
                          rowHeight={43}
                          columnHeaderHeight={47}
                          hideFooter
                          density="compact"
                          processRowUpdate={processRowUpdate}
                          getRowClassName={(params) => params.row.isNew ? 'new-row-highlight' : ''}
                          sx={{
                            height: '100%',
                            '& .MuiDataGrid-cell': { fontSize: '0.8rem' },
                            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
                            '& .MuiDataGrid-row:nth-of-type(even)': { backgroundColor: '#f2f7ff' },
                            '& .MuiDataGrid-row:hover': { backgroundColor: '#e3edfd !important', cursor: 'pointer' },
                            '& .new-row-highlight': { backgroundColor: '#dff0d8 !important', fontWeight: 'bold' },
                            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', color: '#1a237e' },
                          }}
                        />
                      </Paper>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      * 왼쪽의 키를 클릭하면 설정 리스트에 즉시 추가됩니다.
                    </Typography>
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
                        flex: 2,
                        '& .MuiInputBase-root': { height: '32px' }, // 전체 높이 고정
                        '& .MuiInputBase-input': {
                          py: 0,
                          fontSize: '0.85rem',
                          height: '32px',
                          boxSizing: 'border-box'
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.85rem',
                          transform: 'translate(14px, 7px) scale(1)' // 라벨 위치 중앙 조정
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -8px) scale(0.75)' // 포커스 시 라벨 위치
                        }
                      }}
                    />
                    <TextField
                      select label="SQL TYPE" size="small" sx={{
                        flex: 1,
                        '& .MuiInputBase-root': { height: '32px' }, // ID 필드와 높이 통일
                        '& .MuiInputBase-input': {
                          py: 0,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          height: '32px',
                          boxSizing: 'border-box'
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.85rem',
                          transform: 'translate(14px, 7px) scale(1)'
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -8px) scale(0.75)'
                        }
                      }}
                      value={currentSql.sqlType || ''} // 👈 값이 없으면(null/empty) 'SELECT'를 보여줘라
                      onChange={handleSqlTypeChange}
                    >
                      {['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UPSERT'].map((type) => (
                        <MenuItem key={type} value={type} sx={{ fontSize: '0.8rem' }}>{type}</MenuItem>
                      ))}
                    </TextField>
                    <Box>
                      <TextField
                        label="SQL Query"
                        multiline
                        rows={8} // 💡 8줄에서 5줄로 줄여서 위쪽 공간 확보
                        // maxRows={8} // 내용이 많아지면 8줄까지는 유동적으로 늘어남
                        fullWidth
                        value={currentSql.sqlContent || ''}
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
                        onClick={editingId !== null ? handleUpdateSql : handleAddSql}
                        sx={{ height: '32px', fontSize: '0.85rem' }}
                      >
                        {editingId !== null ? '수정 완료' : '목록에 추가'} {/* 👈 모드에 따른 텍스트 변경 */}
  </Button>
                      {editingId !== null && (
    <Button
      variant="outlined"
      size="small"
      onClick={() => {
        setEditingId(null);
        setCurrentSql({ sqlId: '', sqlType: 'SELECT', sqlContent: '' });
      }}
      sx={{ height: '32px', fontSize: '0.85rem', ml: 1 }}
    >
      취소
    </Button>
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
                          bgcolor: editingId === item.id ? '#e3f2fd' : 'transparent',
    borderLeft: editingId === item.id ? '4px solid #1976d2' : '4px solid transparent',
                          minHeight: '28px',
                          '&:hover': { bgcolor: editingId === item.id ? '#e3f2fd' : '#f5f5f5' }
                        }}
                      >
                        <Typography variant="body2" sx={{
                          fontSize: '0.75rem',
                          fontWeight: editingId === item.id ? 'bold' : 'normal',
                         color: editingId === item.id ? '#1976d2' : 'inherit',
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
    sx={{ 
      color: editingId === item.id ? '#d32f2f' : 'error.main', 
      p: 0.2 
    }}
    onClick={(e) => handleDeleteSql(e, item)}
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