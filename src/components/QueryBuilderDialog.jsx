import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, MenuItem, Box, Typography,
  Checkbox, Divider, FormControlLabel, Grid, Chip, CircularProgress
} from '@mui/material';
import { interfaceApi } from '../api/interfaceApi';

const QueryBuilderDialog = ({ open, onClose, onApply }) => {
  // --- States ---
  const [tables, setTables] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCols, setSelectedCols] = useState([]);
  const [whereCols, setWhereCols] = useState([]);
  const [queryType, setQueryType] = useState('SELECT');
  const [loading, setLoading] = useState(false);

  // --- API 호출 로직 ---
  const loadTables = useCallback(async () => {
    try {
      const res = await interfaceApi.fetchTables();
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Table Load Error:", error);
    }
  }, []);

  const loadColumns = useCallback(async (tableName) => {
    if (!tableName) return;
    setLoading(true);
    try {
      const res = await interfaceApi.fetchColumns(tableName);
      setColumns(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Column Load Error:", error);
      alert("컬럼 정보를 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 모달 오픈 시 초기화
  useEffect(() => {
    if (open) {
      loadTables();
    } else {
      // 닫힐 때 상태 초기화 (필요시)
      setSelectedTable('');
      setColumns([]);
      setSelectedCols([]);
      setWhereCols([]);
    }
  }, [open, loadTables]);

  // --- Handlers ---
  const handleTableChange = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    setSelectedCols([]);
    setWhereCols([]);
    loadColumns(tableName);
  };

  const handleSelectAll = (e) => {
    setSelectedCols(e.target.checked ? [...columns] : []);
  };

  const handleColToggle = (col) => {
    setSelectedCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  // --- SQL Generation Logic ---
  const generateSql = () => {
    if (!selectedTable) return;

    const cols = selectedCols.length > 0 ? selectedCols.join(", ") : "*";
    const whereClause = whereCols.length > 0 
      ? `\nWHERE 1=1\n  AND ${whereCols.map(c => `${c} = :${c.toLowerCase()}`).join("\n  AND ")}`
      : "\nWHERE 1=1";

    let finalSql = "";

    switch (queryType) {
      case 'INSERT':
        const placeholders = selectedCols.map(c => `:${c.toLowerCase()}`).join(", ");
        finalSql = `INSERT INTO ${selectedTable} (${selectedCols.join(", ")})\nVALUES (${placeholders})`;
        break;
      case 'UPDATE':
        const sets = selectedCols.map(c => `${c} = :${c.toLowerCase()}`).join(",\n    ");
        finalSql = `UPDATE ${selectedTable}\nSET ${sets}${whereClause}`;
        break;
      case 'DELETE':
        finalSql = `DELETE FROM ${selectedTable}${whereClause}`;
        break;
      default: // SELECT
        finalSql = `SELECT ${cols}\nFROM ${selectedTable}${whereClause}`;
    }

    onApply(finalSql);
    onClose(); // 적용 후 자동 닫기
  };

  // --- UI Components ---
  const isAllSelected = columns.length > 0 && selectedCols.length === columns.length;
  const isIndeterminate = selectedCols.length > 0 && selectedCols.length < columns.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        🪄 쿼리 빌더
        {loading && <CircularProgress size={20} color="secondary" />}
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: 2, minHeight: 400 }}>
        <Stack spacing={2.5}>
          {/* 1. 테이블 및 유형 설정 */}
          <Stack direction="row" spacing={1}>
            <TextField
              select
              label="대상 테이블"
              size="small"
              value={selectedTable}
              onChange={handleTableChange}
              fullWidth
              disabled={loading}
            >
              {tables.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField 
              select 
              label="쿼리 유형" 
              size="small" 
              value={queryType} 
              onChange={(e) => setQueryType(e.target.value)} 
              sx={{ width: 160 }}
            >
              {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Stack>

          {/* 2. WHERE 조건 설정 (Multi-Select) */}
          <TextField
            select
            fullWidth
            label="WHERE 조건 컬럼 (다중 선택)"
            size="small"
            value={whereCols}
            disabled={loading || columns.length === 0}
            onChange={(e) => setWhereCols(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#e1f5fe' }} />
                  ))}
                </Box>
              ),
            }}
          >
            {columns.map((col) => (
              <MenuItem key={col} value={col} sx={{ fontSize: '0.85rem' }}>
                <Checkbox size="small" checked={whereCols.indexOf(col) > -1} />
                {col}
              </MenuItem>
            ))}
          </TextField>

          {/* 3. 컬럼 선택 영역 (Grid) */}
          <Box sx={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: 1, 
            bgcolor: '#fcfcfc',
            opacity: queryType === 'DELETE' ? 0.5 : 1, // DELETE일 땐 비활성화 시각화
            pointerEvents: queryType === 'DELETE' ? 'none' : 'auto'
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 0.5, bgcolor: '#f5f5f5' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                {queryType === 'SELECT' ? '조회 대상 컬럼' : '반영 대상 컬럼'}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox 
                    size="small" 
                    indeterminate={isIndeterminate} 
                    checked={isAllSelected} 
                    onChange={handleSelectAll} 
                  />
                }
                label={<Typography variant="caption" sx={{ fontWeight: 'medium' }}>전체 선택</Typography>}
              />
            </Stack>
            <Divider />

            <Box sx={{ maxHeight: 200, overflowY: 'auto', p: 1.5 }}>
              {columns.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {loading ? "데이터를 불러오는 중입니다..." : "선택된 테이블이 없거나 컬럼이 존재하지 않습니다."}
                </Typography>
              ) : (
                <Grid container spacing={0}>
                  {columns.map(col => (
                    <Grid item xs={6} key={col}>
                      <FormControlLabel
                        sx={{ width: '100%', m: 0 }}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedCols.includes(col)}
                            onChange={() => handleColToggle(col)}
                          />
                        }
                        label={<Typography variant="body2" sx={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#f9f9f9' }}>
        <Button onClick={onClose} color="inherit" size="small">취소</Button>
        <Button 
          onClick={generateSql} 
          variant="contained" 
          size="small" 
          color="secondary" 
          disabled={!selectedTable || (queryType !== 'DELETE' && selectedCols.length === 0)}
        >
          쿼리 적용
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueryBuilderDialog;