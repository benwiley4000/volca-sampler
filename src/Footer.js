import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';

import classes from './Footer.module.scss';

const Footer = React.memo(function Footer() {
  const [showingOfflineModal, setShowingOfflineModal] = useState(false);
  const [showingFAQModal, setShowingFAQModal] = useState(false);
  return (
    <>
      <div className={classes.footer}>
        <p>
          <strong>Volca Sampler</strong> is an app created by{' '}
          <a href="https://benwiley.org" target="_blank" rel="noreferrer">
            Ben Wiley
          </a>
          .
        </p>
        <p>
          <strong>volca sample</strong> is a trademark of{' '}
          <strong>KORG Inc.</strong>, who is not affiliated with this app.
        </p>
        <p>
          The source code can be found on{' '}
          <a
            href="https://github.com/benwiley4000/volca-sampler"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
        {window.location.protocol !== 'http:' && (
          <p>
            <Button
              type="button"
              variant="link"
              onClick={() => setShowingOfflineModal(true)}
            >
              Run this app offline
            </Button>
            .
          </p>
        )}
        <Button
          className={classes.faqAndLicensesButton}
          type="button"
          variant="link"
          onClick={() => setShowingFAQModal(true)}
        >
          FAQ / Licenses
        </Button>
        <div className={classes.faqAndLicensesEmbedded}>
          <FAQAndLicensesContent />
        </div>
      </div>
      <Modal
        show={showingOfflineModal}
        aria-labelledby="offline-modal"
        onHide={() => setShowingOfflineModal(false)}
      >
        <Modal.Header>
          <Modal.Title id="offline-modal">Run this app offline</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Volca Sampler</strong> can be downloaded and run offline if
            you prefer!
          </p>
          <p>How to run Volca Sampler offline:</p>
          <ol>
            <li>
              Install{' '}
              <a
                href="https://www.python.org/downloads/"
                target="_blank"
                rel="noreferrer"
              >
                Python 3
              </a>
              .
            </li>
            <li>
              Download the{' '}
              <a href="Volca-Sampler-Offline.zip" download>
                zipped app
              </a>{' '}
              and extract the contents.
            </li>
            <li>
              Run <code>VOLCASAMPLER.py</code> with Python 3. You can open
              Command Prompt on Windows, or a Terminal on macOS and Linux, to{' '}
              <code>Volca-Sampler-Offline/</code> and run{' '}
              <code>python3 VOLCASAMPLER.py</code>.
            </li>
            <li>
              Normally,{' '}
              <a href="http://localhost:54411" target="_blank" rel="noreferrer">
                http://localhost:54411
              </a>{' '}
              should open in a web browser.
            </li>
          </ol>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowingOfflineModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showingFAQModal}
        aria-labelledby="faq-modal"
        onHide={() => setShowingFAQModal(false)}
      >
        <Modal.Header>
          <Modal.Title id="faq-modal">About Volca Sampler</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FAQAndLicensesContent />
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowingFAQModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
});

function FAQAndLicensesContent() {
  return (
    <>
      <p>
        This app relies on the open-source{' '}
        <a
          href="https://github.com/korginc/volcasample"
          target="_blank"
          rel="noreferrer"
        >
          SYRO
        </a>{' '}
        library published by <strong>KORG Inc.</strong>, which encodes audio
        data to be sent to the <strong>volca sample</strong>.
      </p>
      <p>
        Big thanks to Blairman and to{' '}
        <a
          href="https://soundcloud.com/southtechnique"
          target="_blank"
          rel="noreferrer"
        >
          Costas Chris
        </a>{' '}
        for helping to test the alpha version!
      </p>
      <p>
        And thanks again to KORG for developing the{' '}
        <a
          href="https://apps.apple.com/us/app/audiopocket-for-volca-sample/id927415821"
          target="_blank"
          rel="noreferrer"
        >
          AudioPocket
        </a>{' '}
        app, which inspired the core functionality of Volca Sampler.
      </p>
      <h3>FAQ</h3>
      <div className={classes.qAndA}>
        <p>
          <strong>Q: What platforms are supported?</strong>
        </p>
        <p>
          A: Anything that can run a modern web browser with a headphone output
          should work (PC, Mac, Linux, Android, iOS).
        </p>
      </div>
      <div className={classes.qAndA}>
        <p>
          <strong>Q: Is this compatible with the volca sample2?</strong>
        </p>
        <p>
          A: Yes, but only the stereo cable connection is supported. There are
          no plans for supporting the USB connection.
        </p>
      </div>
      <div className={classes.qAndA}>
        <p>
          <strong>Q: Where will my samples be uploaded?</strong>
        </p>
        <p>
          A: Nowhere. Everything is kept on your device, in your web browser's
          application files. SYRO (the code that converts your samples into
          something the volca sample can understand) is actually running inside
          your web browser.
        </p>
      </div>
      <div className={classes.qAndA}>
        <p>
          <strong>Q: Can I export my samples to another device?</strong>
        </p>
        <p>
          A: You can download the audio for any sample (either the source audio
          or the optimized audio with your settings applied), but we don't
          currently support any type of bulk export of your samples and
          configurations. Some type of peer-to-peer syncing support might be
          coming in the near future if there's interest from users.
        </p>
      </div>
      <div className={classes.qAndA}>
        <p>
          <strong>Q: Where can I contact you?</strong>
        </p>
        <p>
          A:{' '}
          <a
            href="mailto:therealbenwiley@gmail.com?subject=Volca Sampler"
            target="_blank"
            rel="noreferrer"
          >
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
          to file an issue with this app.
        </p>
      </div>
      <h3>Licenses</h3>
      <h5>SYRO</h5>
      <p>Copyright (c) 2014, KORG Inc. All rights reserved.</p>
      <p>
        Redistribution and use in source and binary forms, with or without
        modification, are permitted provided that the following conditions are
        met:
      </p>
      <p>
        Redistributions of source code must retain the above copyright notice,
        this list of conditions and the following disclaimer.
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
        THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
        IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
        TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
        PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
        HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
        SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
        TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
        PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
        LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
        NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
        SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      </p>
      <h5>Other open source licenses</h5>
      <p>
        See the full list{' '}
        <a href="npm-licenses.html" target="_blank" rel="noreferrer">
          here
        </a>
        .
      </p>
    </>
  );
}

export default Footer;
