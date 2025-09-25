"use client";

import type { PropsWithChildren, JSX } from "react";
import { AuthProvider } from "@/components/providers";

const AppProviders = ({ children }: PropsWithChildren): JSX.Element => (
  <AuthProvider>{children}</AuthProvider>
);

export default AppProviders;
