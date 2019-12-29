export default function applySentryIntersceptors(axiosInstance, { Sentry }) {
  axiosInstance.interceptors.response.use(null, async (error) => {
    const isClientError = (
      error.response
      && error.response.status >= 400
      && error.response.status < 500
    );

    if (isClientError) {
      Sentry.captureException(error);
    }

    throw error;
  });
}
