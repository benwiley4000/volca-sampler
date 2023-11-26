go install
env GOOS=windows GOARCH=amd64 go build .
env GOOS=linux GOARCH=amd64 go build .
env GOOS=darwin GOARCH=amd64 go build .
env GOOS=darwin GOARCH=arm64 go build .
