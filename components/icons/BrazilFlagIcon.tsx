import React from 'react';

export const BrazilFlagIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="m0 0h1000v700h-1000z" fill="#009b3a"/>
    <path d="m500 85 415 265-415 265-415-265z" fill="#fddf00"/>
    <circle cx="500" cy="350" r="175" fill="#002776"/>
  </svg>
);
