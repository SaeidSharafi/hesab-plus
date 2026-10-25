<?php

/**
 * Hesab+ design tokens.
 *
 * Warm paper surfaces, deep teal as the primary action colour, amber as the
 * accent for money/obligations. All screens use these tokens (never raw hex
 * except data-driven category colours). Dark mode is explicit.
 */
return [
    'theme' => [
        'light' => [
            'primary' => '#0F766E',
            'on-primary' => '#FFFFFF',
            'primary-container' => '#CCFBF1',
            'on-primary-container' => '#134E4A',

            'secondary' => '#57534E',
            'on-secondary' => '#FFFFFF',

            'surface' => '#FFFFFF',
            'on-surface' => '#1C1917',
            'background' => '#F7F5F0',
            'on-background' => '#1C1917',
            'surface-variant' => '#F1EDE6',
            'on-surface-variant' => '#57534E',

            'input-fill' => '#FFFFFF',
            'on-input' => '#1C1917',
            'outline' => '#D6D3D1',
            'outline-variant' => '#E7E5E4',

            'destructive' => '#B91C1C',
            'on-destructive' => '#FFFFFF',
            'success' => '#15803D',
            'on-success' => '#FFFFFF',
            'warning' => '#B45309',
            'on-warning' => '#FFFFFF',
            'accent' => '#B45309',
            'on-accent' => '#FFFFFF',
            'info' => '#0369A1',
            'on-info' => '#FFFFFF',
        ],

        'dark' => [
            'primary' => '#2DD4BF',
            'on-primary' => '#042F2E',
            'primary-container' => '#134E4A',
            'on-primary-container' => '#CCFBF1',

            'secondary' => '#A8A29E',
            'on-secondary' => '#1C1917',

            'surface' => '#1C1917',
            'on-surface' => '#FAFAF9',
            'background' => '#0C0A09',
            'on-background' => '#FAFAF9',
            'surface-variant' => '#292524',
            'on-surface-variant' => '#A8A29E',

            'input-fill' => '#1C1917',
            'on-input' => '#FAFAF9',
            'outline' => '#44403C',
            'outline-variant' => '#292524',

            'destructive' => '#F87171',
            'on-destructive' => '#1C1917',
            'success' => '#4ADE80',
            'on-success' => '#052E16',
            'warning' => '#FBBF24',
            'on-warning' => '#451A03',
            'accent' => '#FDBA74',
            'on-accent' => '#431407',
            'info' => '#7DD3FC',
            'on-info' => '#082F49',
        ],

        'radius-sm' => 8,
        'radius-md' => 12,
        'radius-lg' => 20,
        'radius-full' => 9999,

        'font-sm' => 14,
        'font-md' => 16,
        'font-lg' => 20,
        'font-xl' => 26,
    ],

    'fonts' => [
        'default' => 'Vazirmatn-Regular',
        'medium' => 'Vazirmatn-Medium',
        'semibold' => 'Vazirmatn-SemiBold',
        'bold' => 'Vazirmatn-Bold',
        'extrabold' => 'Vazirmatn-ExtraBold',
    ],
];
