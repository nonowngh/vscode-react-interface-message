import React, { useState, useMemo } from 'react';
import { DataGrid, GridFooterContainer, GridFooter } from '@mui/x-data-grid';
import {
  Box, Paper, TextField, InputAdornment, MenuItem, FormControl,
  InputLabel, Select, Stack, IconButton, Tooltip, Chip, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloudOffIcon from '@mui/icons-material/CloudOff'; // 미배포용 아이콘

const gridStyles = {
  container: { height: 580, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid #e9ebee' },
  grid: {
    border: 'none',
    bgcolor: '#99add61a',
    color: '#083821',
    '& .MuiDataGrid-columnHeader': { backgroundColor: '#6b7771 !important', color: '#ffffff !important' },
    '& .MuiDataGrid-columnHeaderTitle': { fontWeight: '700 !important', color: '#c9f7e4 !important' },
    '& .MuiDataGrid-cell': { border: 'none !important', position: 'relative', display: 'flex', alignItems: 'center' },
    '& .MuiDataGrid-cell::after': {
      content: '""', position: 'absolute', right: 0, top: '25%', height: '50%', width: '1px', backgroundColor: '#4a5568', opacity: 0.3
    },
    '& .MuiDataGrid-row:hover': { backgroundColor: '#7a978133 !important', transition: '0.2s' },
    '& .MuiDataGrid-footerContainer': { backgroundColor: '#647596 !important', color: '#ffffff !important' },
    '& .MuiTablePagination-root, & .MuiTablePagination-selectIcon, & .MuiIconButton-root': { color: '#ffffff !important' }
  }
};

const InterfaceGrid = ({ rows = [], onRowClick, onDeployManage, loading }) => {
  const [searchText, setSearchText] = useState('');
  const [filterUseYn, setFilterUseYn] = useState('ALL');
  const [filterPattern, setFilterPattern] = useState('ALL');

  const patternOptions = useMemo(() =>
    [...new Set(rows.map(r => r.patternName).filter(Boolean))].sort()
    , [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchUseYn = filterUseYn === 'ALL' || row.useYn === filterUseYn;
      const matchPattern = filterPattern === 'ALL' || row.patternName === filterPattern;
      const search = searchText.toLowerCase().trim();
      const matchSearch = !search || [row.interfaceId, row.interfaceName, row.patternName]
        .some(v => (v || '').toLowerCase().includes(search));
      return matchUseYn && matchPattern && matchSearch;
    });
  }, [rows, searchText, filterUseYn, filterPattern]);

  const columns = useMemo(() => [
    {
      field: 'no', headerName: '#', width: 50, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.api.getRowIndexRelativeToVisibleRows(p.id) + 1
    },
    {
      field: 'interfaceId',
      headerName: '인터페이스 ID',
      flex: 1.2,
      renderCell: (params) => (
        <Typography
          onClick={() => onRowClick(params.row)}
          sx={{ color: '#1a5f7a', cursor: 'pointer', fontWeight: 'bold', '&:hover': { textDecoration: 'underline' } }}
        >
          {params.value}
        </Typography>
      )
    },
    { field: 'interfaceName', headerName: '인터페이스 명', flex: 1.8 },
    { field: 'patternName', headerName: '연계 패턴', flex: 0.7, align: 'center', headerAlign: 'center' },
    { field: 'sendSystemCode', headerName: '송신 시스템', flex: 0.7, align: 'center', headerAlign: 'center' },
    { field: 'recvSystemCode', headerName: '수신 시스템', flex: 0.7, align: 'center', headerAlign: 'center' },
    {
      field: 'useYn',
      headerName: '사용 여부',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box sx={{ color: params.value === 'Y' ? '#1e61a0' : '#c62828', fontWeight: 'bold', fontSize: '0.75rem' }}>
          {params.value === 'Y' ? '사용' : '미사용'}
        </Box>
      )
    },
    {
      field: 'deployStatus',
      headerName: '배포 상태',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const { deployStatus, lastDeployAt, updatedAt, deploySuccessCount, deployTotalCount } = params.row;

        const lastDeployTime = lastDeployAt ? new Date(lastDeployAt).getTime() : 0;
        const lastUpdateTime = updatedAt ? new Date(updatedAt).getTime() : 0;

        // 🚀 상태 판별 로직
        let chipConfig = {
          label: "배포 완료",
          color: "success",
          icon: <CheckCircleIcon style={{ fontSize: 16 }} />,
          tooltip: "운영 서버와 설정이 일치합니다."
        };

        // if (!lastDeployAt) {
        if(deployStatus === 'N'){
          // 1. 배포 이력이 아예 없는 경우
          chipConfig = {
            label: "미배포",
            color: "default",
            icon: <CloudOffIcon style={{ fontSize: 16 }} />,
            tooltip: "한 번도 배포되지 않았습니다."
          };
        } else if (deployStatus === 'P') {
          chipConfig = {
            label: "배포 중",
            color: "info", // 하늘색 계열
            icon: <ErrorOutlineIcon style={{ fontSize: 16, color: '#fff' }} />,
            tooltip: "일부 어댑터 배포에 실패했거나 진행 중입니다. 확인이 필요합니다."
          };
        } else if (deployStatus === 'F' || lastUpdateTime > lastDeployTime) {
          chipConfig = {
            label: "배포 필요",
            color: "warning",
            icon: <ErrorOutlineIcon style={{ fontSize: 16 }} />,
            tooltip: "설정이 변경되었습니다. 재배포가 필요합니다."
          };
        }

        const handleDeployClick = (e) => {
          e.stopPropagation();
          if (onDeployManage) onDeployManage(params.row);
        };

        return (
          <Tooltip title={chipConfig.tooltip}>
            <Chip
              label={chipConfig.label}
              color={chipConfig.color}
              size="small"
              onClick={handleDeployClick}
              icon={chipConfig.icon}
              sx={{
                fontWeight: 'bold', width: 100, cursor: 'pointer',
                '&:hover': { boxShadow: 2, transform: 'scale(1.05)' },
                transition: 'all 0.1s'
              }}
            />
          </Tooltip>
        );
      }
    },
  ], [onRowClick, onDeployManage]);

  const CustomFooter = () => (
    <GridFooterContainer sx={{ px: 2, bgcolor: '#1e293b', borderTop: '1px solid #334155' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#81c784' }}>
        🔍 검색 결과: {filteredRows.length}건 / 전체: {rows.length}건
      </Typography>
      <GridFooter sx={{ border: 'none', color: '#eceff1' }} />
    </GridFooterContainer>
  );

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#647596', borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton
            onClick={() => { setSearchText(''); setFilterUseYn('ALL'); setFilterPattern('ALL'); }}
            size="small" sx={{ color: '#eceff1' }}
          >
            <FilterListIcon fontSize="small" />
          </IconButton>

          <FilterSelect label="연계 패턴" value={filterPattern} onChange={setFilterPattern} options={patternOptions} />
          <FilterSelect label="사용 여부" value={filterUseYn} onChange={setFilterUseYn} options={['Y', 'N']} />

          <TextField
            fullWidth size="small" placeholder="ID 또는 명칭 검색..."
            value={searchText} onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#b0bec5' }} /></InputAdornment>
            }}
            sx={{
              input: { color: 'white' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#edebf5' },
              '& .MuiInputBase-input::placeholder': { color: '#cfd8dc', opacity: 1 }
            }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={gridStyles.container}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.interfaceId}
          loading={loading}
          hideFooterSelectedRowCount
          slots={{ footer: CustomFooter }}
          sx={gridStyles.grid}
        />
      </Paper>
    </Box>
  );
};

const FilterSelect = ({ label, value, onChange, options }) => (
  <FormControl size="small" sx={{ minWidth: 120 }}>
    <InputLabel sx={{ color: '#b0bec5' }}>{label}</InputLabel>
    <Select
      value={value} label={label}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        color: 'white',
        '.MuiOutlinedInput-notchedOutline': { borderColor: '#edebf5' },
        '.MuiSvgIcon-root': { color: 'white' }
      }}
    >
      <MenuItem value="ALL">전체</MenuItem>
      {options.map(opt => (
        <MenuItem key={opt} value={opt}>
          {opt === 'Y' ? '사용' : opt === 'N' ? '미사용' : opt}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default InterfaceGrid;