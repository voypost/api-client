import qs from 'qs';

export default function applyAuth0Intersceptors(axios, {
  clientId,
  clientSecret,
  audience,
  scope,
  tokenBaseUrl,
  localStorageService,
}) {
  async function refreshAccessToken() {
    const res = await axios({
      url: `${tokenBaseUrl}/oauth/token`,
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

  axios.interceptors.request.use(
    async config => {
      if (config.url === `${tokenBaseUrl}/oauth/token`) {
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

  axios.interceptors.response.use(
    response => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response && error.response.status === 401 && originalRequest.url ===
        `${tokenBaseUrl}/oauth/token`) {
        throw error;
      }

      if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // const refreshToken = localStorageService.getRefreshToken();
          // const res = await axios({
          //   url: `${tokenBaseUrl}/oauth/token`,
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

          await ensureAccessToken();
          axios.defaults.headers.common['Authorization'] = `Bearer ${localStorageService.getAccessToken()}`;
          return axios(originalRequest);
      }
      throw error;
    },
  );
}
