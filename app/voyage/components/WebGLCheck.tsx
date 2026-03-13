'use client';

import { useEffect, useState } from 'react';
import { isWebGLAvailable } from '../utils/webgl';

interface WebGLCheckProps {
  children: React.ReactNode;
}

export default function WebGLCheck({ children }: WebGLCheckProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check WebGL availability on mount
    setWebglSupported(isWebGLAvailable());
  }, []);

  // While checking, don't render anything (brief flash prevention)
  if (webglSupported === null) {
    return null;
  }

  // If WebGL is not supported, show error message
  if (!webglSupported) {
    return (
      <div className="webgl-error-container">
        <div className="webgl-error-content">
          <h1 className="webgl-error-title">3D preview could not start.</h1>
          <p className="webgl-error-body">
            Your browser may not support WebGL or hardware acceleration may be disabled.
          </p>
          <p className="webgl-error-action">
            Please try Chrome or enable hardware acceleration.
          </p>
          <a
            href="chrome://settings"
            className="webgl-error-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            How to enable hardware acceleration
          </a>
        </div>

        <style jsx>{`
          .webgl-error-container {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            z-index: 9999;
          }

          .webgl-error-content {
            max-width: 500px;
            padding: 2rem;
            text-align: center;
          }

          .webgl-error-title {
            font-size: 1.875rem;
            font-weight: 700;
            margin: 0 0 1.5rem 0;
            color: #f1f5f9;
            line-height: 1.2;
          }

          .webgl-error-body {
            font-size: 1.125rem;
            line-height: 1.6;
            margin: 0 0 1rem 0;
            color: #cbd5e1;
          }

          .webgl-error-action {
            font-size: 1rem;
            line-height: 1.6;
            margin: 0 0 2rem 0;
            color: #94a3b8;
          }

          .webgl-error-link {
            display: inline-block;
            color: #60a5fa;
            text-decoration: none;
            font-size: 0.9375rem;
            font-weight: 500;
            border-bottom: 1px solid transparent;
            transition: all 0.2s ease;
          }

          .webgl-error-link:hover {
            color: #93c5fd;
            border-bottom-color: #93c5fd;
          }

          .webgl-error-link:focus {
            outline: 2px solid #60a5fa;
            outline-offset: 4px;
            border-radius: 2px;
          }
        `}</style>
      </div>
    );
  }

  // WebGL is supported, render the children (A-Frame scene)
  return <>{children}</>;
}
