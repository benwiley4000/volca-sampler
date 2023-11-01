import React, { useRef } from 'react';
import { Button, Modal, InputGroup, FormControl } from 'react-bootstrap';

import classes from './PluginConfirmModal.module.scss';

const PluginConfirmModal = React.memo(
  /**
   * @param {{
   *   pluginName: string;
   *   variant: 'confirm-name' | 'replace'
   *   onConfirmName: (name: string) => void;
   *   onConfirmReplace: (
   *     replaceResponse: 'replace' | 'use-existing' | 'change-name'
   *   ) => void;
   * }} props
   */
  function PluginConfirmModal({
    pluginName,
    variant,
    onConfirmName,
    onConfirmReplace,
  }) {
    /** @type {React.RefObject<HTMLInputElement>} */
    const confirmNameRef = useRef(null);
    return (
      <Modal
        className={classes.pluginConfirmModal}
        aria-labelledby="plugin-confirm-modal"
      >
        <Modal.Header>
          <Modal.Title id="plugin-confirm-modal">
            {variant === 'confirm-name' && 'Confirm name of new plugin'}
            {variant === 'replace' && 'A plugin with this name exists'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {variant === 'confirm-name' && (
            <InputGroup>
              <FormControl
                ref={confirmNameRef}
                defaultValue={pluginName.replace(/\.js$/, '').toLowerCase()}
                onChange={(e) =>
                  (e.target.value = e.target.value.toLowerCase())
                }
                placeholder="Plugin name"
                aria-label="Plugin name"
                aria-describedby=".js"
              />
              <InputGroup.Text id=".js">.js</InputGroup.Text>
            </InputGroup>
          )}
          {variant === 'replace' && (
            <p>
              Do you want to replace the existing <strong>{pluginName}</strong>?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer className={classes.footer}>
          {variant === 'confirm-name' && (
            <Button
              type="button"
              variant="primary"
              disabled={
                !confirmNameRef.current || !confirmNameRef.current.value
              }
              onClick={() => {
                if (confirmNameRef.current && confirmNameRef.current.value) {
                  onConfirmName(`${confirmNameRef.current.value}.js`);
                }
              }}
            >
              OK
            </Button>
          )}
          {variant === 'replace' && (
            <>
              <Button
                type="button"
                variant="light"
                onClick={() => onConfirmReplace('change-name')}
              >
                Choose new name
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() => onConfirmReplace('use-existing')}
              >
                Use existing
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => onConfirmReplace('replace')}
              >
                Replace
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    );
  }
);

export default PluginConfirmModal;
