import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';

import classes from './Footer.module.scss';

const Footer = React.memo(function Footer() {
  const [showingModal, setShowingModal] = useState(false);
  return (
    <>
      <p className={classes.footer}>
        <strong>Volca Sampler</strong> is an app created by{' '}
        <strong>
          <a href="https://benwiley.org" target="_blank" rel="noreferrer">
            Ben Wiley
          </a>
        </strong>
        .
        <br />
        <strong>volca sample</strong> is a trademark of{' '}
        <strong>KORG Inc.</strong>
        , who is not affiliated with this app.
        <br />
        Source code for this app can be found on{' '}
        <a
          href="https://github.com/benwiley4000/volca-sampler"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
        <br />
        <Button
          type="button"
          variant="link"
          onClick={() => setShowingModal(true)}
        >
          FAQ / Licenses
        </Button>
      </p>
      <Modal
        show={showingModal}
        aria-labelledby="faq-modal"
        onHide={() => setShowingModal(false)}
      >
        <Modal.Header>
          <Modal.Title id="faq-modal">About Volca Sampler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This app relies on the open-source{' '}
            <strong>
              <a
                href="https://github.com/korginc/volcasample"
                target="_blank"
                rel="noreferrer"
              >
                SYRO
              </a>
            </strong>{' '}
            library published by <strong>KORG Inc.</strong>, which encodes audio
            data to be sent to the <strong>volca sample</strong>.
          </p>
          <h3>FAQ</h3>
          <p>
            <strong>Q: What platforms are supported?</strong>
          </p>
          <p>
            A: Anything that can run a modern web browser with a headphone
            output should work (PC, Mac, Linux, Android, iOS).
          </p>
          <p>
            <strong>Q: Is this compatible with the volca sample2?</strong>
          </p>
          <p>
            A: Yes, but only the stereo cable connection is supported. There are
            no plans for supporting the USB connection.
          </p>
          <p>
            <strong>Q: Where will my samples be uploaded?</strong>
          </p>
          <p>
            A: Nowhere. Everything is kept on your device, in your web browser's
            application files. SYRO (the code that converts your samples into
            something the volca sample can understand) is actually running
            inside your web browser.
          </p>
          <p>
            <strong>Q: Can I export my samples to another device?</strong>
          </p>
          <p>
            A: You can download the audio for any sample (either the source
            audio or the optimized audio with your settings applied), but we
            don't currently support any type of bulk export of your samples and
            configurations. Some type of peer-to-peer syncing support might be
            coming in the near future if there's interest from users.
          </p>
          <p>
            <strong>Q: Where can I contact you?</strong>
          </p>
          <p>
            A:{' '}
            <a href="mailto:therealbenwiley@gmail.com?subject=Volca Sampler">
              Email
            </a>{' '}
            to get in touch with me personally, or{' '}
            <a
              href="https://github.com/benwiley4000/volca-sampler/issues"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>{' '}
            to file an issue with this App.
          </p>
          <h3>Licenses</h3>
          <h5>SYRO</h5>
          <p>Copyright (c) 2014, KORG Inc. All rights reserved.</p>
          <p>
            Redistribution and use in source and binary forms, with or without
            modification, are permitted provided that the following conditions
            are met:
          </p>
          <p>
            Redistributions of source code must retain the above copyright
            notice, this list of conditions and the following disclaimer.
          </p>
          <p>
            Redistributions in binary form must reproduce the above copyright
            notice, this list of conditions and the following disclaimer in the
            documentation and/or other materials provided with the distribution.
          </p>
          <p>
            Neither the name of the copyright holder nor the names of its
            contributors may be used to endorse or promote products derived from
            this software without specific prior written permission.
          </p>
          <p>
            THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
            "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
            LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
            FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
            COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
            INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
            BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
            LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
            CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
            LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
            ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGE.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowingModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});

export default Footer;
