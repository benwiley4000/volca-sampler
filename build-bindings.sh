emcc \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap"]' \
  -s MODULARIZE=1 -s 'EXPORT_NAME="CREATE_SYRO_BINDINGS"' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O3 \
  ./syro/volcasample/syro/korg_syro_volcasample.c \
  ./syro/volcasample/syro/korg_syro_func.c \
  ./syro/volcasample/syro/korg_syro_comp.c \
  ./syro/syro-bindings.c \
  -o public/syro-bindings.js
