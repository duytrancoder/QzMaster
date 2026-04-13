import React, { useEffect } from 'react';

const SPLINE_SCRIPT_ID = 'spline-viewer-script';
const SPLINE_SCRIPT_SRC = 'https://unpkg.com/@splinetool/viewer@1.9.56/build/spline-viewer.js';
const SPLINE_SCENE_URL = 'https://prod.spline.design/DlnNMurvV4Ugn-k6/scene.splinecode';
const HOME_BG_URL = 'https://resend.com/_next/image?url=%2Fstatic%2Flanding-page%2Fbghero.png&w=1080&q=75';

export function Home() {
  useEffect(() => {
    const existingScript = document.getElementById(SPLINE_SCRIPT_ID);
    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.id = SPLINE_SCRIPT_ID;
    script.type = 'module';
    script.src = SPLINE_SCRIPT_SRC;
    document.head.appendChild(script);
  }, []);

  return (
    <div
      className="-m-8 h-full overflow-hidden bg-[#07080a]"
      style={{
        backgroundImage: `url(${HOME_BG_URL})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {React.createElement('spline-viewer', {
        url: SPLINE_SCENE_URL,
        style: { width: '100%', height: '100%', display: 'block' },
      })}
    </div>
  );
}
