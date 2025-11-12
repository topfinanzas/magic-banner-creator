
import React from 'react';

export const RedoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 9H9a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h8" />
    <polyline points="17 13 21 9 17 5" />
  </svg>
);
