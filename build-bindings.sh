# For debugging memory issues, we can
# replace -O3 with:
# -g \
# -s STACK_OVERFLOW_CHECK=1 \
# -s DEMANGLE_SUPPORT=1 -s \
# INITIAL_MEMORY=655360000 \
# -fsanitize=address \

emcc \
  -s WASM=1 \
  -s EXPORTED_RUNTIME_METHODS='["cwrap", "addFunction", "removeFunction"]' \
  -s MODULARIZE=1 -s 'EXPORT_NAME="CREATE_SYRO_BINDINGS"' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ALLOW_TABLE_GROWTH=1 \
  -O3 \
  ./syro/volcasample/syro/korg_syro_volcasample.c \
  ./syro/volcasample/syro/korg_syro_func.c \
  ./syro/volcasample/syro/korg_syro_comp.c \
  ./syro/syro-bindings.c \
  -o public/syro-bindings.js

emcc \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s BUILD_AS_WORKER=1 \
  -O3 \
  ./syro/volcasample/syro/korg_syro_volcasample.c \
  ./syro/volcasample/syro/korg_syro_func.c \
  ./syro/volcasample/syro/korg_syro_comp.c \
  ./syro/syro-worker.c \
  -o public/syro-worker.js
