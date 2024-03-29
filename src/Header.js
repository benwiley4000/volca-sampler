import React from 'react';
import { Container } from 'react-bootstrap';

import classes from './Header.module.scss';

const Header = React.memo(
  /**
   * @param {{ onHeaderClick: () => void }} props
   * @returns
   */
  function Header({ onHeaderClick }) {
    return (
      <div className={classes.titleBar}>
        <Container fluid="sm" className={classes.titleContainer}>
          <h1 className={classes.title} onClick={onHeaderClick}>
            <span className={classes.titleText} data-text="Volca Sample">
              Volca Sample
              <span className={classes.titleR}>r</span>
              <svg
                viewBox="0 0 150 150"
                preserveAspectRatio="none"
                className={classes.titleStarburst}
              >
                {
                  /** @type {void[]} */ (Array(24))
                    .fill()
                    .map((_, i, { length }) => (
                      <polygon
                        key={i}
                        points="75,70 75,80 150,75"
                        transform-origin="75 75"
                        // @ts-ignore
                        style={{ '--rotation': `${(i * 360) / length}deg` }}
                      />
                    ))
                }
              </svg>
            </span>
            <div className={classes.titleGraphic}>
              <img
                src="volca_sample.png"
                alt=""
              />
            </div>
            <div className={classes.tagline}>
              <h2>for volca sample</h2>
            </div>
          </h1>
        </Container>
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
      </div>
    );
  }
);

export default Header;
