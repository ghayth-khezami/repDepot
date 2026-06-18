import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import './api/authApi';
import './api/productApi';
import './api/commandApi';
import './api/statsApi';
import './api/categoryApi';
import './api/clientApi';
import './api/coClientApi';
import './api/depositRequestApi';
import './api/markApi';
import './api/clientFeedbackApi';
import './api/newsletterApi';
import './api/storeHoursApi';
import './api/userApi';
import './api/featuredProductApi';
import './api/subCategoryApi';

export const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
