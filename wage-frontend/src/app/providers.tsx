"use client";

import type { PropsWithChildren, JSX } from "react";
import { AuthProvider, ConfigProvider } from "@/components/providers";

const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <ConfigProvider>
    <AuthProvider>{children}</AuthProvider>
  </ConfigProvider>
);

export default AppProviders;
