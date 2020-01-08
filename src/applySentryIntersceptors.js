export default function applySentryIntersceptors(axiosInstance, { Sentry }) {
  axiosInstance.interceptors.response.use(null, async (error) => {
    const isClientError = (
      error.response
      && error.response.status >= 400
      && error.response.status < 500
    );

    if (isClientError) {
      Sentry.addBreadcrumb({
        category: 'error',
        message: 'Axios request error',
        data: {
          config: error.config,
          response: error.response,
        },
        level: Sentry.Severity.Error,
      });
    }

    throw error;
  });
}
