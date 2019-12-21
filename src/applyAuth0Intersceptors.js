import qs from 'qs';
import axios from 'axios';

export default function applyAuth0Intersceptors(axiosInstance, {
  clientId,
  clientSecret,
  audience,
  scope,
  tokenBaseUrl,
  localStorageService,
}) {
  const tokenBaseUrlSafe = tokenBaseUrl.indexOf('/', tokenBaseUrl.length - 1) !== -1
    ? tokenBaseUrl.substr(0, tokenBaseUrl.length - 1)
    : tokenBaseUrl;
  const tokenUrl = `${tokenBaseUrlSafe}/oauth/token`;

  async function refreshAccessToken() {
    const res = await axios({
      url: tokenUrl,
      method: 'post',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({
        grant_type: 'client_credentials',
        scope,
        client_id: clientId,
        client_secret: clientSecret,
        audience,
      }),
    });
    const {
      access_token: accessToken,
      // refresh_token: refreshToken,
    } = res.data;
    localStorageService.setAccessToken(accessToken);
    // localStorageService.setRefreshToken(refreshToken);
  }

  let prom;
  async function refreshAccessTokenOnce() {
    if (!prom) {
      prom = refreshAccessToken();
    }
    await prom;
    prom = null;
  }

  async function ensureAccessToken() {
    const lastToken = localStorageService.getAccessToken();
    if (!lastToken) {
      await refreshAccessTokenOnce();
    }
  }

  axiosInstance.interceptors.request.use(
    async config => {
      if (config.url === tokenUrl) {
        return config;
      }

      await ensureAccessToken();
      const token = localStorageService.getAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    async error => {
      throw error;
    },
  );

  axiosInstance.interceptors.response.use(
    response => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response && error.response.status === 401 && originalRequest.url ===
        tokenUrl) {
        throw error;
      }

      if (error.response && error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // const refreshToken = localStorageService.getRefreshToken();
        // const res = await axios({
        //   url: tokenUrl,
        //   method: 'post',
        //   headers: {
        //     'content-type': 'application/x-www-form-urlencoded',
        //   },
        //   data: {
        //     grant_type: 'refresh_token',
        //     client_id: clientId,
        //     client_secret: clientSecret,
        //     refresh_token: refreshToken,
        //   },
        // });
        // const {
        //   access_token: accessToken,
        // } = res.data;
        // localStorageService.setAccessToken(accessToken);

        await refreshAccessTokenOnce();
        return axiosInstance(originalRequest);
      }
      throw error;
    },
  );
}
