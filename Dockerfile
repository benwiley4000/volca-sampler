FROM benwiley4000/emsdk-puppeteer

WORKDIR /source

COPY . .
RUN npm ci && \
  ./build-bindings.sh && \
  ./build-factory-samples-index && \
  npm run build && \
  rm -rf node_modules

# We expect a mount at /out for output files!
CMD grep -q ' /out ' /proc/self/mountinfo || { echo 'Missing mount: /out' >&2; exit 1; }; \
    internal_out=build; \
    mkdir -p /out && cp -r $internal_out/. /out
