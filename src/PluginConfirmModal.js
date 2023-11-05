import React, { useEffect, useState } from 'react';
import { Button, Modal, InputGroup, FormControl } from 'react-bootstrap';

import classes from './PluginConfirmModal.module.scss';

const PluginConfirmModal = React.memo(
  /**
   * @param {{
   *   pluginName: string;
   *   variant: 'confirm-name' | 'replace' | 'rename';
   *   onConfirmName: (name: string) => void;
   *   onConfirmReplace: (
   *     replaceResponse: 'replace' | 'use-existing' | 'change-name'
   *   ) => void;
   *   onCancelRename: () => void;
   * }} props
   */
  function PluginConfirmModal({
    pluginName,
    variant,
    onConfirmName,
    onConfirmReplace,
    onCancelRename,
  }) {
    const [nameValue, setNameValue] = useState(
      pluginName.replace(/\.js$/, '').toLowerCase()
    );
    useEffect(() => {
      setNameValue(pluginName.replace(/\.js$/, '').toLowerCase());
    }, [pluginName]);
    return (
      <Modal
        className={classes.pluginConfirmModal}
        aria-labelledby="plugin-confirm-modal"
        show
        centered
        onHide={onCancelRename}
      >
        <Modal.Header>
          <Modal.Title id="plugin-confirm-modal">
            {variant === 'confirm-name' && 'Confirm name of new plugin'}
            {variant === 'replace' && 'A plugin with this name exists'}
            {variant === 'rename' && 'Rename plugin'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {(variant === 'confirm-name' || variant === 'rename') && (
            <InputGroup>
              <FormControl
                defaultValue={nameValue}
                onChange={(e) => {
                  setNameValue((e.target.value = e.target.value.toLowerCase()));
                }}
                placeholder="Plugin name"
                aria-label="Plugin name"
                aria-describedby=".js"
                autoFocus
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
              disabled={!nameValue}
              onClick={() => {
                if (nameValue) {
                  onConfirmName(`${nameValue}.js`);
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
          {variant === 'rename' && (
            <>
              <Button
                type="button"
                variant="light"
                onClick={() => onCancelRename()}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={
                  !nameValue || pluginName.replace(/\.js$/, '') === nameValue
                }
                onClick={() => {
                  onConfirmName(`${nameValue}.js`);
                }}
              >
                Rename
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    );
  }
);

export default PluginConfirmModal;
