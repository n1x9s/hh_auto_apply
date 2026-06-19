package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"hhapplicanttool/internal/goapp"
)

func main() {
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	if err := goapp.Run(ctx, os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}
