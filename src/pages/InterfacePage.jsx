import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Button, Paper, Stack, IconButton, Tooltip, Box
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import InterfaceGrid from '../components/InterfaceGrid';
import InterfaceDialog from '../components/InterfaceDialog';
import DeployManagerDialog from '../components/DeployManagerDialog'; // 🚀 신규 추가
import { interfaceApi } from '../api/interfaceApi';

const InterfacePage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 상세 수정 다이얼로그 상태
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // 2. 🚀 배포 관리 다이얼로그 상태
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState(null);

  // 데이터 로드 로직
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await interfaceApi.fetchList();
      setRows(response.data);
    } catch (err) {
      console.error("데이터 로딩 실패:", err);
      alert("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 상세 수정 팝업 열기
  const handleEditOpen = (item = null) => {
    setSelectedItem(item || {
      interfaceId: '',
      cronExpression: '',
      patternType: '',
      sendSystemCode: '',
      recvSystemCode: '',
      useYn: 'N'
    });
    setEditOpen(true);
  };

  // 🚀 배포 관리 팝업 열기 (그리드의 배포 상태 칩 클릭 시 호출)
  const handleDeployOpen = (item) => {
    setDeployTarget(item);
    setDeployOpen(true);
  };

  // 저장 처리
  const handleSave = async (formData) => {
    try {
      await interfaceApi.save(formData);
      setEditOpen(false);
      loadData(); // 배포 상태가 'N'으로 바뀔 것이므로 재로딩
    } catch (err) {
      const errorMsg = err.response?.data || "저장 처리 중 오류가 발생했습니다.";
      alert(errorMsg);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2} sx={{ width: '100%' }}>
        
        {/* --- 상단 헤더 영역 --- */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#829189',
            borderRadius: 2,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Box sx={{ pl: 2, borderLeft: '4px solid #1b5e20' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f1f8e9', display: 'flex', alignItems: 'center', gap: 1, lineHeight: 1.2 }}>
              🔌 인터페이스 통합 관리
            </Typography>
            <Typography variant="caption" sx={{ color: '#e0e0e0', mt: 0.2, display: 'block' }}>
              시스템 간 연계 설정 및 배포 현황을 관리합니다.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="목록 새로고침">
              <IconButton onClick={loadData} disabled={loading} sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' } }}>
                <RefreshIcon sx={{ color: '#f1f8e9' }} />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleEditOpen()}
              disabled={loading}
              sx={{ fontWeight: 'bold', px: 2.5, py: 0.8, bgcolor: '#1b5e20', '&:hover': { bgcolor: '#2e7d32' }, borderRadius: '6px', textTransform: 'none' }}
            >
              신규 등록
            </Button>
          </Stack>
        </Paper>

        {/* --- 데이터 그리드 영역 --- */}
        <Box sx={{ width: '100%' }}>
          <InterfaceGrid
            rows={rows}
            onRowClick={handleEditOpen}    // 행 클릭 -> 수정 팝업
            onDeployManage={handleDeployOpen} // 🚀 배포 칩 클릭 -> 배포 팝업
            loading={loading}
          />
        </Box>
      </Stack>

      {/* --- 다이얼로그 모음 --- */}
      
      {/* 1. 상세 수정 다이얼로그 */}
      {editOpen && (
        <InterfaceDialog
          open={editOpen}
          data={selectedItem}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* 2. 🚀 배포 관리 다이얼로그 (배포 실행 및 이력 확인) */}
      {deployOpen && (
        <DeployManagerDialog
          open={deployOpen}
          interfaceId={deployTarget?.interfaceId}
          interfaceName={deployTarget?.interfaceName}
          lastModifiedTime={deployTarget?.updatedAt}
          onClose={() => setDeployOpen(false)}
          onRefresh={loadData} // 배포 완료 후 메인 그리드 상태(Y) 갱신용
        />
      )}
    </Container>
  );
};

export default InterfacePage;