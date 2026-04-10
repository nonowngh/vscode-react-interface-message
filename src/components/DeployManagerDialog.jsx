import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
    Box, Checkbox, Grid, Paper, List, ListItem, ListItemButton, ListItemText,
    CircularProgress, Stack, ListItemIcon, Tabs, Tab, IconButton, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Divider, Collapse, Tooltip
} from '@mui/material';
import {
    RocketLaunch as RocketIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Update as UpdateIcon,
    CheckCircle as CheckIcon,
    PauseCircle as PauseIcon,
    Cancel as CancelIcon,
    WarningAmber as WarningIcon
} from '@mui/icons-material';
import { interfaceApi } from '../api/interfaceApi';

const formatDeployVersion = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    const yy = date.getFullYear().toString().slice(-2);
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yy}${mm}${dd}${hh}${mi}${ss}`;
};

const STATUS_COLORS = {
    SUCCESS: '#3b82f6',
    PENDING: '#f59e0b',
    FAIL: '#ef4444',
    OPERATING: '#10b981',
    STOP: '#64748b',
    WARNING: '#f97316'
};

const DeployManagerDialog = ({
    open,
    onClose,
    interfaceId,
    interfaceName,
    useYn, // 부모로부터 전달받음 ('Y' 또는 'N')
    lastModifiedTime,
    onRefresh
}) => {
    // --- 1. States ---
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [adapters, setAdapters] = useState([]);
    const [history, setHistory] = useState([]);
    const [selectedAdapters, setSelectedAdapters] = useState([]);
    const [selectedProject, setSelectedProject] = useState('DEPLOYED_ONLY');
    const [isProjectListOpen, setIsProjectListOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // 인터페이스 미사용 여부 판단
    const isDisabledInterface = useYn === 'N';

    // --- 2. 초기화 로직 (사용여부에 따른 탭 설정) ---
    useEffect(() => {
        if (open) {
            if (isDisabledInterface) {
                setTabValue(1); // 미사용 시 '배포 이력' 탭 고정
            } else {
                setTabValue(0); // 사용 중일 때 기본 탭
            }
        }
    }, [open, isDisabledInterface]);

    // --- 3. 데이터 로드 로직 ---
    const loadInitialData = useCallback(async () => {
        if (!interfaceId || isDisabledInterface) return; // 미사용 시 로드 방지
        setLoading(true);
        try {
            const res = await interfaceApi.fetchAdaptorStatusWithMapping(interfaceId);
            const data = res.data || [];
            data.sort((a, b) => {
                if (a.lastDeployTime && !b.lastDeployTime) return -1;
                if (!a.lastDeployTime && b.lastDeployTime) return 1;
                return new Date(b.lastDeployTime) - new Date(a.lastDeployTime);
            });
            setAdapters(data);
            const mappedIds = data
                .filter(item => item.isMapped === 'Y' && String(item.finalMoStatus) === '1')
                .map(item => item.pdName);
            setSelectedAdapters(mappedIds);
        } catch (err) { console.error("데이터 로드 실패:", err); }
        finally { setLoading(false); }
    }, [interfaceId, isDisabledInterface]);

    const loadDeployHistory = useCallback(async () => {
        if (!interfaceId) return;
        setLoading(true);
        try {
            const res = await interfaceApi.fetchDeployHistory(interfaceId);
            setHistory((res.data || []).map(row => ({
                id: row.deploySeq,
                date: row.deployedAt,
                version: row.deployVersion || '-',
                user: row.deployedBy,
                target: row.targetAdapter,
                status: row.resultCode
            })));
        } catch (err) { console.error("이력 로드 실패:", err); }
        finally { setLoading(false); }
    }, [interfaceId]);

    useEffect(() => {
        if (open) {
            tabValue === 0 ? loadInitialData() : loadDeployHistory();
        }
    }, [open, tabValue, loadInitialData, loadDeployHistory]);

    // --- 4. 배포 실행 로직 ---
    const handleFinalDeploy = async () => {
        setConfirmOpen(false);
        setLoading(true);
        const version = formatDeployVersion(lastModifiedTime);
        try {
            const response = await interfaceApi.requestAsyncDeploy({
                interfaceId,
                adapterIds: selectedAdapters,
                deployVersion: version
            });
            if (response.data?.result === "success" || response.status === 200) {
                alert(`${selectedAdapters.length}개의 어댑터에 배포 요청을 완료했습니다.`);
                setTabValue(1);
                if (onRefresh) onRefresh();
                await loadDeployHistory();
            } else {
                throw new Error("배포 요청 실패");
            }
        } catch (err) {
            alert("배포 요청 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // --- 5. UI Render Helpers ---
    const getStatusUI = useCallback((status) => {
        const s = String(status);
        const configs = {
            '1': { icon: <CheckIcon sx={{ fontSize: 14 }} />, text: '운영', color: STATUS_COLORS.OPERATING },
            '0': { icon: <CircularProgress size={12} sx={{ color: STATUS_COLORS.PENDING }} />, text: '기동중', color: STATUS_COLORS.PENDING },
            '-2': { icon: <PauseIcon sx={{ fontSize: 14 }} />, text: '정지', color: STATUS_COLORS.STOP },
            'P': { icon: <CircularProgress size={12} sx={{ color: STATUS_COLORS.PENDING }} />, text: '배포 중', color: STATUS_COLORS.PENDING },
            'S': { icon: <CheckIcon sx={{ fontSize: 14 }} />, text: '배포 완료', color: STATUS_COLORS.SUCCESS },
            'F': { icon: <CancelIcon sx={{ fontSize: 14 }} />, text: '배포 실패', color: STATUS_COLORS.FAIL },
        };
        return configs[s] || { icon: <CancelIcon sx={{ fontSize: 14 }} />, text: '중단', color: STATUS_COLORS.FAIL };
    }, []);

    const groupedData = useMemo(() => {
        return adapters.reduce((acc, curr) => {
            const name = curr.pjName || '미지정';
            if (!acc[name]) acc[name] = [];
            acc[name].push(curr);
            return acc;
        }, {});
    }, [adapters]);

    const renderAdapterCard = (adpt) => {
        const isDisable = String(adpt.finalMoStatus) !== '1';
        const isSelected = selectedAdapters.includes(adpt.pdName);
        const ui = getStatusUI(adpt.finalMoStatus);
        const isOutdated = adpt.lastDeployTime && lastModifiedTime
            ? new Date(adpt.lastDeployTime) < new Date(lastModifiedTime) : false;

        return (
            <Grid item xs={6} key={adpt.pdName}>
                <Paper
                    variant="outlined"
                    onClick={() => !isDisable && setSelectedAdapters(prev =>
                        prev.includes(adpt.pdName) ? prev.filter(a => a !== adpt.pdName) : [...prev, adpt.pdName]
                    )}
                    sx={{
                        p: 1.5, display: 'flex', alignItems: 'center', cursor: isDisable ? 'default' : 'pointer',
                        borderColor: isSelected ? STATUS_COLORS.SUCCESS : isOutdated ? STATUS_COLORS.WARNING : '#cbd5e1',
                        bgcolor: isSelected ? '#f0f7ff' : 'white',
                        borderWidth: isSelected || isOutdated ? 2 : 1,
                        opacity: isDisable ? 0.6 : 1,
                        '&:hover': { borderColor: isDisable ? '#e2e8f0' : STATUS_COLORS.SUCCESS }
                    }}
                >
                    <Checkbox size="small" checked={isSelected} disabled={isDisable} />
                    <Box sx={{ ml: 1, overflow: 'hidden', flexGrow: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="caption" fontWeight="bold" noWrap>{adpt.pdAlias || adpt.pdName}</Typography>
                            {isOutdated && <Tooltip title="수정 후 미배포"><WarningIcon sx={{ color: STATUS_COLORS.WARNING, fontSize: 16 }} /></Tooltip>}
                        </Stack>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                            {ui.icon}
                            <Typography sx={{ fontSize: '0.65rem', color: ui.color, fontWeight: 'bold' }}>{ui.text}</Typography>
                        </Stack>
                        <Typography sx={{ fontSize: '0.6rem', color: isOutdated ? STATUS_COLORS.WARNING : 'text.secondary' }}>
                            최종: {adpt.lastDeployTime || '기록없음'}
                        </Typography>
                    </Box>
                </Paper>
            </Grid>
        );
    };

    const renderDeployHistory = () => (
        <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <TableContainer component={Paper} variant="outlined">
                {/* 1. tableLayout: 'fixed'를 추가해야 width 설정이 강제로 적용됩니다. */}
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', minWidth: 650 }}>
                    <TableHead>
                        <TableRow>
                            {/* 2. 날짜와 버전은 최소 140~150px 정도는 되어야 줄바꿈이 안 일어납니다. */}
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', width: '160px' }}>배포 일시</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', width: '120px' }}>배포 버전</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', width: '80px' }}>요청자</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold' }}>대상</TableCell>
                            <TableCell align="center" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', width: '130px' }}>상태</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.map((row) => {
                            const statusMap = {
                                'S': { label: '배포 완료', color: STATUS_COLORS.SUCCESS },
                                'P': { label: '배포 중', color: STATUS_COLORS.PENDING },
                                'F': { label: '배포 실패', color: STATUS_COLORS.FAIL }
                            };
                            const current = statusMap[row.status] || { label: '기타', color: '#64748b' };

                            return (
                                <TableRow key={row.id} hover>
                                    {/* 4. Body 셀들도 정렬을 맞추기 위해 align="center" 추가 */}
                                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.date}</TableCell>
                                    <TableCell align="center" sx={{ fontSize: '0.75rem', fontWeight: '500', color: '#1e293b' }}>
                                        {row.version}
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontSize: '0.75rem' }}>{row.user}</TableCell>

                                    {/* 5. 데이터가 너무 길어질 경우를 대비한 텍스트 처리 */}
                                    <TableCell sx={{
                                        fontSize: '0.75rem',
                                        px: 2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {Array.isArray(row.target) ? row.target.join(', ') : row.target}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Chip label={current.label} size="small" variant="outlined" sx={{ fontSize: '0.65rem', color: current.color, borderColor: current.color, fontWeight: 'bold' }} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                {/* 상단 헤더 */}
                <Box sx={{ bgcolor: '#1e293b', color: 'white', px: 3, py: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <RocketIcon sx={{ color: isDisabledInterface ? '#94a3b8' : '#38bdf8' }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                                배포 관리 - {interfaceName} {isDisabledInterface && "(미사용)"}
                            </Typography>
                        </Stack>
                        <IconButton size="small" onClick={tabValue === 0 ? loadInitialData : loadDeployHistory} sx={{ color: 'white' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Stack>
                    {/* 수정 시간 정보 */}
                    <Paper variant="outlined" sx={{ mt: 1.5, bgcolor: '#0f172a', borderColor: '#334155', p: 1.2 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: '#94a3b8' }}>
                                <UpdateIcon sx={{ fontSize: 16 }} />
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>인터페이스 최종 수정:</Typography>
                            </Stack>
                            <Typography sx={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 'bold' }}>
                                {lastModifiedTime ? lastModifiedTime.replace('T', ' ').split('.')[0] : '-'}
                            </Typography>
                        </Stack>
                    </Paper>
                </Box>

                {/* 탭 제어: 미사용 시 '어댑터 선택' 숨김 */}
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {!isDisabledInterface && <Tab label="어댑터 선택" sx={{ fontSize: '0.8rem' }} />}
                    <Tab label="배포 이력" sx={{ fontSize: '0.8rem' }} />
                </Tabs>

                <DialogContent sx={{ p: 0, height: '55vh' }}>
                    {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box> : (
                        tabValue === 0 && !isDisabledInterface ? (
                            <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
                                <Box sx={{ width: 220, borderRight: '1px solid #e2e8f0', bgcolor: 'white' }}>
                                    <List disablePadding>
                                        <ListItemButton selected={selectedProject === 'DEPLOYED_ONLY'} onClick={() => setSelectedProject('DEPLOYED_ONLY')}>
                                            <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon sx={{ fontSize: 18, color: STATUS_COLORS.SUCCESS }} /></ListItemIcon>
                                            <ListItemText primary="현재 배포 어댑터" primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'bold' }} />
                                        </ListItemButton>
                                        <Divider />
                                        <ListItemButton onClick={() => setIsProjectListOpen(!isProjectListOpen)} sx={{ bgcolor: '#f8fafc' }}>
                                            <ListItemIcon sx={{ minWidth: 32 }}><RocketIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                                            <ListItemText primary="배포 추가" primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'bold' }} />
                                            {isProjectListOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                        </ListItemButton>
                                        <Collapse in={isProjectListOpen} timeout="auto" unmountOnExit>
                                            {Object.keys(groupedData).map(name => (
                                                <ListItemButton key={name} selected={selectedProject === name} onClick={() => setSelectedProject(name)} sx={{ pl: 5 }}>
                                                    <ListItemText primary={name} primaryTypographyProps={{ fontSize: '0.75rem' }} />
                                                </ListItemButton>
                                            ))}
                                        </Collapse>
                                    </List>
                                </Box>
                                <Box sx={{ flexGrow: 1, p: 2, bgcolor: '#f1f5f9', overflowY: 'auto' }}>
                                    <Grid container spacing={2}>
                                        {(selectedProject === 'DEPLOYED_ONLY' ? adapters.filter(a => !!a.lastDeployTime) : groupedData[selectedProject])?.map(adpt => renderAdapterCard(adpt))}
                                    </Grid>
                                </Box>
                            </Box>
                        ) : renderDeployHistory()
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
                    {!isDisabledInterface && tabValue === 0 && (
                        <Typography variant="caption" sx={{ flexGrow: 1, ml: 2 }}>선택됨: <b>{selectedAdapters.length}</b>개</Typography>
                    )}
                    <Button onClick={onClose} color="inherit">닫기</Button>
                    {/* 탭이 0(어댑터 선택)이고 사용 중일 때만 버튼 표시 */}
                    {!isDisabledInterface && tabValue === 0 && (
                        <Button variant="contained" color="primary" startIcon={<RocketIcon />} onClick={() => setConfirmOpen(true)} disabled={selectedAdapters.length === 0}>
                            배포 실행
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* 확인 다이얼로그 (기존 로직 유지) */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} PaperProps={{ sx: { borderRadius: 2, width: '450px' } }}>
                <DialogTitle sx={{ bgcolor: '#f8fafc', py: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <RocketIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">배포 실행 확인</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        선택하신 <b>{selectedAdapters.length}개</b>의 어댑터에 배포 명령을 전송하시겠습니까?
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5, border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto' }}>
                        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                            {selectedAdapters.map((id) => (
                                <Chip key={id} label={adapters.find(a => a.pdName === id)?.pdAlias || id} size="small" sx={{ bgcolor: 'white', fontSize: '0.7rem' }} />
                            ))}
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit">취소</Button>
                    <Button onClick={handleFinalDeploy} variant="contained" color="primary" sx={{ fontWeight: 'bold' }}>지금 배포 실행</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default DeployManagerDialog;