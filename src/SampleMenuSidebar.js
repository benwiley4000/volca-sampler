import React from 'react';
import { Offcanvas } from 'react-bootstrap';

import SampleMenu from './SampleMenu.js';

import classes from './SampleMenuSidebar.module.scss';

const SampleMenuSidebar = React.memo(
  /**
   * @param {{
   *   open: boolean;
   *   loading: boolean;
   *   focusedSampleId: string | null;
   *   userSamples: Map<string, import('./store').SampleContainer>;
   *   factorySamples: Map<string, import('./store').SampleContainer>;
   *   setOpen: (open: boolean) => void;
   *   onSampleSelect: (id: string | null) => void;
   * }} props
   */
  function SampleMenuSidebar({
    open,
    loading,
    focusedSampleId,
    userSamples,
    factorySamples,
    setOpen,
    onSampleSelect,
  }) {
    return (
      <Offcanvas
        className={classes.sidebar}
        show={open}
        onHide={() => setOpen(false)}
      >
        <Offcanvas.Header closeButton />
        <Offcanvas.Body className={classes.offcanvasBody}>
          <SampleMenu
            visible={open}
            loading={loading}
            focusedSampleId={focusedSampleId}
            userSamples={userSamples}
            factorySamples={factorySamples}
            onSampleSelect={onSampleSelect}
          />
        </Offcanvas.Body>
      </Offcanvas>
    );
  }
);

export default SampleMenuSidebar;
