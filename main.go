package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/iamyadav/static/ui"
	"github.com/pkg/browser"
)

const port = ":8080"

func main() {
	server := &http.Server{Addr: port}
	assets, _ := ui.Assets()

	// Use the file system to serve static files
	fs := http.FileServer(http.FS(assets))
	http.Handle("/", http.StripPrefix("/", fs))

	// Serve the files using the default HTTP server
	log.Printf("Listening on %s...", port)

	url := fmt.Sprintf("http://localhost%s", port)

	// open user's browser to login page
	if err := browser.OpenURL(url); err != nil {
		log.Fatalf("failed to open browser for url %s", err.Error())
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
