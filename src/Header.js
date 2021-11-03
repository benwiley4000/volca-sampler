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
      </span>
      <div className={classes.titleGraphicContainer}>
        <img className={classes.titleGraphic} src="volca_sample.png" alt="" />
        <img className={classes.titleGraphic} src="volca_sample.png" alt="" />
        <img className={classes.titleGraphic} src="volca_sample.png" alt="" />
        <img className={classes.titleGraphic} src="volca_sample.png" alt="" />
      </div>
    </h1>
  );
}

export default Header;
