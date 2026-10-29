# Iron Man · Arc Storm

The existing `bella-iron` skin now costs 10 coins and uses the user's transparent illustration unchanged at `public/assets/characters/iron-man-arc.png`. Its stable ID preserves previous ownership; previously purchased copies do not require another payment.

The source is a 1408×736 RGBA PNG with foreground bounds x=389–1035. A nested SVG viewBox frames the transparent margins without changing pixels or cutting off foreground. The avatar and seat dimensions remain unchanged.

The new `electric` SVG/CSS effect replaces missiles: cyan/white electric paths behind and in front, counter-rotating segmented HUD rings, a pulsing reactor aligned to the chest, a palm ring, orbiting energy particles, sparks and a restrained blue aura. Shapes remain inside the existing avatar viewport. Motion uses CSS, no polling or JavaScript animation loop, and becomes static under reduced-motion preferences.
