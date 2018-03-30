package units

import (
	"context"
	"testing"
	"time"

	"github.com/evergreen-ci/evergreen"
	"github.com/evergreen-ci/evergreen/cloud"
	"github.com/evergreen-ci/evergreen/db"
	"github.com/evergreen-ci/evergreen/mock"
	"github.com/evergreen-ci/evergreen/model/host"
	"github.com/evergreen-ci/evergreen/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHostMonitoringCheckJob(t *testing.T) {
	assert := assert.New(t)
	require := require.New(t)
	testConfig := testutil.TestConfig()
	db.SetGlobalSessionProvider(testConfig.SessionFactory())

	env := &mock.Environment{
		EvergreenSettings: testConfig,
	}

	mockCloud := cloud.GetMockProvider()
	mockCloud.Reset()

	// reset the db
	require.NoError(db.ClearCollections(host.Collection))

	m1 := cloud.MockInstance{
		IsUp:           true,
		IsSSHReachable: true,
		Status:         cloud.StatusTerminated,
	}
	mockCloud.Set("h1", m1)

	// this host should be picked up and updated to running
	h := &host.Host{
		Id: "h1",
		LastCommunicationTime: time.Now().Add(-15 * time.Minute),
		Status:                evergreen.HostRunning,
		Provider:              evergreen.ProviderNameMock,
		StartedBy:             evergreen.User,
	}
	require.NoError(h.Insert())

	j := NewHostMonitorExternalStateJob(env, h, "one")
	assert.False(j.Status().Completed)

	j.Run(context.Background())

	assert.NoError(j.Error())
	assert.True(j.Status().Completed)

	host1, err := host.FindOne(host.ById("h1"))
	assert.NoError(err)
	assert.Equal(host1.Status, evergreen.HostTerminated)
}
