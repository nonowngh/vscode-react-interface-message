import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:24051/', // 자바 백엔드 서버 주소
    // baseURL: '/interface-manager/', // 자바 백엔드 서버 주소
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 자바의 Interceptor처럼 요청/응답 전처리가 가능합니다.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API 에러 발생:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;