import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';

interface AntdProviderProps {
  children: ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3B82F6',
          colorBgBase: '#020617',
          colorBgContainer: '#0f172a',
          colorBgElevated: '#1e293b',
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default AntdProvider;
