import React from 'react';

import classes from './Header.module.scss';

/**
 * @param {{ onMenuOpen: () => void, onHeaderClick: () => void }} props
 * @returns
 */
function Header({ onMenuOpen, onHeaderClick }) {
  return (
    <h1 className={classes.title} onClick={onHeaderClick}>
      <span
        className={classes.menuIcon}
        onClick={(e) => {
          e.stopPropagation();
          onMenuOpen();
        }}
      >
        ☰
      </span>
      <span className={classes.titleText} data-text="Volca Sample">
        Volca Sample
        <span className={classes.titleR}>r</span>
        <div className={classes.titleStarburst}>
          {
            /** @type {void[]} */ (Array(24)).fill().map((_, i, { length }) => (
              <span
                key={i}
                // @ts-ignore
                style={{ '--rotation': `${(i * 360) / length}deg` }}
              />
            ))
          }
        </div>
      </span>
      <img className={classes.titleGraphic} src="volca_sample.png" alt="" />
      <svg width={0} height={0}>
        {/* https://tympanus.net/codrops/2019/01/22/svg-filter-effects-outline-text-with-femorphology/ */}
        <filter id="outline">
          <feMorphology
            in="SourceAlpha"
            result="DILATED"
            operator="dilate"
            radius="1"
          ></feMorphology>
          <feFlood
            floodColor="var(--stroke-color)"
            floodOpacity="1"
            result="PINK"
          ></feFlood>
          <feComposite
            in="PINK"
            in2="DILATED"
            operator="in"
            result="OUTLINE"
          ></feComposite>
          <feMerge>
            <feMergeNode in="OUTLINE" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
    </h1>
  );
}

export default Header;
