import React from 'react';
import { ProductionLogin } from './public/ProductionLogin';
import type { User } from '@chaintrace/types';

interface LoginPageProps {
  onLoginSuccess?: (token: string, user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = () => {
  return <ProductionLogin />;
};
