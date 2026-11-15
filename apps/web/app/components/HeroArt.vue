<template>
  <!-- Quizmaster heron: flat illustration in the brand palette (coral, gold, cream). Decorative, described once for screen readers. -->
  <svg viewBox="0 0 480 420" role="img" aria-label="Een vrolijke reiger met een strikje vraagt: Wie weet het?" class="hero-art">
    <circle cx="250" cy="215" r="170" class="blob" />
    <circle cx="96" cy="330" r="34" fill="#FFC93C" opacity=".9" />
    <circle cx="432" cy="86" r="18" fill="#FF5A38" opacity=".9" />
    <circle cx="410" cy="300" r="10" fill="#FFC93C" />

    <!-- reeds -->
    <g stroke="#3E9B6E" stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M92 392 C90 350 98 330 88 300" /><path d="M108 392 C110 360 120 340 132 318" /><path d="M400 392 C402 352 394 332 404 304" /><path d="M416 392 C414 366 424 350 438 332" />
    </g>
    <ellipse cx="260" cy="392" rx="130" ry="12" fill="#241512" opacity=".12" />

    <!-- legs + feet -->
    <g stroke="#D9A441" stroke-width="6" stroke-linecap="round" fill="none">
      <path d="M248 288 L244 384" /><path d="M276 290 L284 384" />
      <path d="M244 384 L224 390 M244 384 L252 392 M284 384 L266 391 M284 384 L304 390" />
    </g>

    <!-- tail, body, wing -->
    <path d="M196 262 L120 300 L206 292 Z" fill="#7C93AB" />
    <ellipse cx="256" cy="252" rx="78" ry="50" transform="rotate(-14 256 252)" fill="#9DB0C4" />
    <path d="M200 252 C226 214 286 218 312 252 C280 276 226 280 200 252 Z" fill="#7C93AB" />
    <path d="M214 258 C238 240 280 240 298 256" stroke="#9DB0C4" stroke-width="4" fill="none" stroke-linecap="round" />

    <!-- neck + head -->
    <path d="M300 230 C348 204 292 160 318 118" stroke="#9DB0C4" stroke-width="20" stroke-linecap="round" fill="none" />
    <circle cx="320" cy="106" r="19" fill="#9DB0C4" />
    <path d="M304 100 C316 94 330 96 336 104" stroke="#241512" stroke-width="5" stroke-linecap="round" fill="none" />
    <path d="M306 92 C292 84 282 76 270 76 M308 96 C294 92 284 90 274 92" stroke="#241512" stroke-width="3" stroke-linecap="round" fill="none" />
    <path d="M336 104 L402 118 L338 118 Z" fill="#FFC93C" />
    <circle cx="326" cy="106" r="4" fill="#241512" /><circle cx="327.5" cy="104.5" r="1.4" fill="#fff" />

    <!-- bow tie (quizmaster) -->
    <g transform="translate(306 196) rotate(-20)">
      <path d="M0 0 L-22 -12 L-22 12 Z M0 0 L22 -12 L22 12 Z" fill="#FF5A38" />
      <circle r="6" fill="#E8471F" />
    </g>

    <!-- speech bubble -->
    <g>
      <rect x="40" y="38" width="176" height="64" rx="22" fill="#FFFFFF" stroke="#E6D9C7" stroke-width="3" />
      <path d="M190 100 L234 128 L206 98 Z" fill="#FFFFFF" stroke="#E6D9C7" stroke-width="3" stroke-linejoin="round" />
      <rect x="186" y="96" width="30" height="8" fill="#FFFFFF" />
      <text x="128" y="78" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="26" fill="#241512">Wie weet het?</text>
    </g>

    <!-- answer chips -->
    <g font-family="Fredoka, sans-serif" font-weight="600" font-size="24" text-anchor="middle">
      <g transform="translate(70 190) rotate(-8)"><rect x="-26" y="-26" width="52" height="52" rx="14" fill="#FFFFFF" stroke="#E6D9C7" stroke-width="3" /><text y="9" fill="#241512">A</text></g>
      <g transform="translate(60 258) rotate(6)"><rect x="-26" y="-26" width="52" height="52" rx="14" fill="#FFC93C" /><text y="9" fill="#241512">B</text><path d="M-12 -2 L-3 8 L14 -12" stroke="#1C8F63" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(22 -24) scale(.8)" /></g>
      <g transform="translate(126 322) rotate(-4)"><rect x="-26" y="-26" width="52" height="52" rx="14" fill="#FFFFFF" stroke="#E6D9C7" stroke-width="3" /><text y="9" fill="#241512">C</text></g>
    </g>
  </svg>
</template>
<style scoped>
.hero-art { width: 100%; height: auto; display: block; }
.blob { fill: var(--accent); opacity: .14; }
</style>
