import axios from 'axios';
import axiosRetry from 'axios-retry';
import qs from 'qs';
import applyAuth0Intersceptors from './applyAuth0Intersceptors';
import LocalStorageService from './LocalStorageService';
import applySentryIntersceptors from './applySentryIntersceptors';

export default function createApiClient({
  clientId,
  clientSecret,
  baseUrl,
  audience,
  tokenBaseUrl,
  scopes,
  Sentry,
}) {
  const axiosInstance = axios.create({
    baseURL: baseUrl,
    paramsSerializer: function (params) {
      return qs.stringify(params, { arrayFormat: 'brackets', skipNulls: true });
    },
  });

  axiosRetry(axiosInstance, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ENOTFOUND';
    },
  });

  const localStorageService = new LocalStorageService();
  applyAuth0Intersceptors(axiosInstance, {
    clientId,
    clientSecret,
    audience,
    scope: scopes.join(' '),
    tokenBaseUrl,
    localStorageService,
  });

  if (Sentry) {
    applySentryIntersceptors(axiosInstance, { Sentry });
  }

  return axiosInstance;
}
