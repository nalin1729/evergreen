package command

import (
	"sync"

	"github.com/evergreen-ci/evergreen/model"
	"github.com/evergreen-ci/evergreen/rest/client"
	"golang.org/x/net/context"
)

// Command is an interface that defines a command
// A Command takes parameters as a map, and is executed after
// those parameters are parsed.
type Command interface {
	// ParseParams takes a map of fields to values extracted from
	// the project config and passes them to the command. Any
	// errors parsing the information are returned.
	ParseParams(params map[string]interface{}) error

	// Execute runs the command using the agent's logger, communicator,
	// task config, and a channel for interrupting long-running commands.
	// Execute is called after ParseParams.
	Execute(context.Context, client.Communicator, client.LoggerProducer, *model.TaskConfig) error

	// A string name for the command
	Name() string

	Type() string
	SetType(string)
}

// base contains a basic implementation of functionality that is
// common to all command implementations.
type base struct {
	typeName string
	mu       sync.RWMutex
}

func (b *base) Type() string {
	b.mu.RLock()
	defer b.mu.RUnlock()

	return b.typeName
}

func (b *base) SetType(n string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.typeName = n
}
