import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// This file is web-only and runs in Node.js during SSG/SSR builds.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Montserrat';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat';
                font-style: normal;
                font-weight: 500;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtZ6Ew-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat';
                font-style: normal;
                font-weight: 600;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu170w-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat';
                font-style: normal;
                font-weight: 700;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat';
                font-style: normal;
                font-weight: 800;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr70w-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat_400Regular';
                font-style: normal;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat_500Medium';
                font-style: normal;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtZ6Ew-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat_600SemiBold';
                font-style: normal;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu170w-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat_700Bold';
                font-style: normal;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf') format('truetype');
              }
              @font-face {
                font-family: 'Montserrat_800ExtraBold';
                font-style: normal;
                font-display: swap;
                src: url('https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCvr70w-.ttf') format('truetype');
              }
              *, *::before, *::after {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              html, body, #root {
                height: 100%;
                margin: 0;
                padding: 0;
                background-color: #111319;
                font-family: Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
              /* Enforce Montserrat on React Native Web text & inputs */
              [dir="auto"],
              [class*="r-14gqq1x"],
              [class*="r-fdjwn4"],
              input, textarea, button, select {
                font-family: Montserrat, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              }
            `,
          }}
        />
        <title>Hermanos Lynch • Gestión Inteligente de Plantas Eléctricas</title>
        <meta name="description" content="Plataforma telemática y operativa para gestión, supervisión y mantenimiento de plantas eléctricas industriales Hermanos Lynch." />
        <meta property="og:title" content="Hermanos Lynch • Plantas Eléctricas" />
        <meta property="og:description" content="Gestión y monitoreo telemático en tiempo real de plantas y generadores eléctricos." />
        <meta name="theme-color" content="#0c1017" />
      </head>
      <body>{children}</body>
    </html>
  );
}
