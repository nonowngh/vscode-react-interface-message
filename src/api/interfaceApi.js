import axiosInstance from './axiosConfig';

/**
 * 인터페이스 및 배포 관련 API 명세
 */
export const interfaceApi = {

  // --- [1] 인터페이스 기본 관리 (v1) ---
  /** 목록 조회 */
  fetchList: () => axiosInstance.get('/api/v1/interfaces'),

  /** 상세 조회 (추가됨) */
  getDetail: (interfaceId) => axiosInstance.get(`/api/v1/interfaces/${interfaceId}`),

  fetchTemplateKeys: (patternType) =>
    axiosInstance.get(`/api/v1/interfaces/properties/keys/${patternType}`),

  /** 저장 및 수정 */
  save: (data) => axiosInstance.post('/api/v1/interfaces', data),

  /** 사용여부(useYn)만 부분 수정 */
  updateUseYn: (interfaceId, useYn) =>
    axiosInstance.patch(`/api/v1/interfaces/${interfaceId}`, { useYn }),

  /** 패턴 마스터 목록 조회 */
  fetchPatterns: () => axiosInstance.get('/api/v1/interfaces/patterns'),

  // --- [2] 배포 관리 (Deploy) ---

  /** * [통합] 전체 어댑터 상태 + 특정 인터페이스 배포 여부 조회 
   * @param {string} interfaceId - 현재 선택된 인터페이스 ID
   * 반환: List<AdaptorInfoDto> (pjId, pjName, pdName, pdAlias, finalMoStatus, isMapped 포함)
   */
  fetchAdaptorStatusWithMapping: (interfaceId) =>
    axiosInstance.get(`/api/deploy/adaptors/status/${interfaceId}`),

  /** * 실제 배포 실행 (JMS 송신) 
   * @param {object} payload - { interfaceId: string, adapterIds: string[] }
   */
  deploy: (payload) => axiosInstance.post('/api/deploy/execute', payload),

  /** * 컴포넌트에서 사용하는 이름과 매핑 (에러 방지용 별칭)
   */
  requestAsyncDeploy: (payload) => axiosInstance.post('/api/deploy/execute', payload),
  
  requestAsyncUndeploy: (payload) => axiosInstance.post('/api/deploy/cancel', payload),

  /** 특정 인터페이스의 배포 이력 조회 */
  fetchDeployHistory: (interfaceId) => axiosInstance.get(`/api/deploy/history/${interfaceId}`),

  // 전체 테이블 목록 조회
  fetchTables: () => axiosInstance.get('/api/metadata/tables'),

  // 특정 테이블의 컬럼 목록 조회
  fetchColumns: (tableName) => axiosInstance.get(`/api/metadata/columns/${tableName}`),
};