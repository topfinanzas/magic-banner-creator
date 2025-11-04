import React from 'react';

export const UKFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" {...props}>
    <clipPath id="a"><path d="m0 0h60v30h-60z"/></clipPath>
    <g clipPath="url(#a)">
      <path d="m0 0h60v30h-60z" fill="#00247d"/>
      <path d="m0 0 60 30m-60 0 60-30" stroke="#fff" strokeWidth="6"/>
      <path d="m0 0 60 30m-60 0 60-30" stroke="#cf142b" strokeWidth="4"/>
      <path d="m30 0v30m-30-15h60" stroke="#fff" strokeWidth="10"/>
      <path d="m30 0v30m-30-15h60" stroke="#cf142b" strokeWidth="6"/>
    </g>
  </svg>
);
