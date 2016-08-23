 /*
  ReactJS code for the Waterfall page. Grid calls the Variant class for each distro, and the Variant class renders each build variant for every version that exists. In each build variant we iterate through all the tasks and render them as well. The row of headers is just a placeholder at the moment.
 */


// Returns string from datetime object in "5/7/96 1:15 AM" format
// Used to display version headers
function getFormattedTime(input, userTz, fmt) {
  return moment(input).tz(userTz).format(fmt);
}


// The Root class renders all components on the waterfall page, including the grid view and the filter and new page buttons
// The one exception is the header, which is written in Angular and managed by menu.html
class Root extends React.Component{
  constructor(props){
    super(props);

    // Initialize newer|older buttons
    var versionsOnPage = _.reduce(_.map(window.serverData.versions, function(version){
      return version.authors.length; 
    }), function(memo,num){
      return memo + num;
    });

    var currentSkip = window.serverData.current_skip;
    var nextSkip = currentSkip + versionsOnPage; 
    var prevSkip = currentSkip - window.serverData.previous_page_count;
   
    this.nextURL = "";
    this.prevURL = ""; 

    // If nextSkip and currentSkip are valid, set a valid href for the buttons
    // Otherwise, the two buttons remain disabled with an empty url
    if (nextSkip < window.serverData.total_versions) {
      this.nextURL = "/waterfall/" + this.props.project + "?skip=" + nextSkip;
    }
    
    if (currentSkip > 0) {
      this.prevURL = "/waterfall/" + this.props.project + "?skip=" + prevSkip;
    }

    // Handle state for a collapsed view, as well as shortened header commit messages
    var collapsed = localStorage.getItem("collapsed") == "true";
    this.state = {
      collapsed: collapsed,
      shortenCommitMessage: true,
      buildVariantFilter: '',
      taskFilter: ''
    };

    this.handleCollapseChange = this.handleCollapseChange.bind(this);
    this.handleHeaderLinkClick = this.handleHeaderLinkClick.bind(this);
    this.handleBuildVariantFilter = this.handleBuildVariantFilter.bind(this);
    this.handleTaskFilter = this.handleTaskFilter.bind(this);

  }
  handleCollapseChange(collapsed) {
    localStorage.setItem("collapsed", collapsed);
    this.setState({collapsed: collapsed});
  }
  handleBuildVariantFilter(filter) {
    this.setState({buildVariantFilter: filter});
  }
  handleTaskFilter(filter) {
    this.setState({taskFilter: filter});
  }
  handleHeaderLinkClick(shortenMessage) {
    this.setState({shortenCommitMessage: !shortenMessage});
  }
  render() {
    if (this.props.data.rows.length == 0){
      return (
        React.createElement("div", null, 
          "There are no builds for this project."
        )
        )
    }
    var collapseInfo = {
      collapsed : this.state.collapsed,
      activeTaskStatuses : ['failed','system-failed'],
    };
    return (
      React.createElement("div", null, 
        React.createElement(Toolbar, {
          collapsed: this.state.collapsed, 
          onCheck: this.handleCollapseChange, 
          nextURL: this.nextURL, 
          prevURL: this.prevURL, 
          buildVariantFilterFunc: this.handleBuildVariantFilter, 
          taskFilterFunc: this.handleTaskFilter}
        ), 
        React.createElement(Headers, {
          shortenCommitMessage: this.state.shortenCommitMessage, 
          versions: this.props.data.versions, 
          onLinkClick: this.handleHeaderLinkClick, 
          userTz: this.props.userTz}
        ), 
        React.createElement(Grid, {
          data: this.props.data, 
          collapseInfo: collapseInfo, 
          project: this.props.project, 
          buildVariantFilter: this.state.buildVariantFilter, 
          taskFilter: this.state.taskFilter}
        )
      )
    )
  }
}

// Toolbar


function Toolbar ({collapsed, onCheck, nextURL, prevURL, buildVariantFilterFunc, taskFilterFunc}) {
  var Form = ReactBootstrap.Form;
  return (
    React.createElement("div", {className: "row"}, 
      React.createElement("div", {className: "col-xs-12"}, 
        React.createElement(Form, {inline: true, className: "waterfall-toolbar pull-right"}, 
          React.createElement(CollapseButton, {collapsed: collapsed, onCheck: onCheck}), 
          React.createElement(FilterBox, {filterFunction: buildVariantFilterFunc, placeholder: "Filter variant", disabled: false}), 
          React.createElement(FilterBox, {filterFunction: taskFilterFunc, placeholder: "Filter task", disabled: collapsed}), 
          React.createElement(PageButtons, {nextURL: nextURL, prevURL: prevURL})
        )
      )
    )
  )
};

function PageButtons ({prevURL, nextURL}) {
  var ButtonGroup = ReactBootstrap.ButtonGroup;
  return (
    React.createElement("span", {className: "waterfall-form-item"}, 
      React.createElement(ButtonGroup, null, 
        React.createElement(PageButton, {pageURL: prevURL, disabled: prevURL === "", directionIcon: "fa-chevron-left"}), 
        React.createElement(PageButton, {pageURL: nextURL, disabled: nextURL === "", directionIcon: "fa-chevron-right"})
      )
    )
  );
}

function PageButton ({pageURL, directionIcon, disabled}) {
  var Button = ReactBootstrap.Button;
  var classes = "fa " + directionIcon;
  return (
    React.createElement(Button, {href: pageURL, disabled: disabled}, React.createElement("i", {className: classes}))
  );
}

class FilterBox extends React.Component {
  constructor(props){
    super(props);
    this.applyFilter = this.applyFilter.bind(this);
  }
  applyFilter() {
    this.props.filterFunction(this.refs.searchInput.value)
  }
  render() {
    return React.createElement("input", {type: "text", ref: "searchInput", 
                  className: "form-control waterfall-form-item", 
                  placeholder: this.props.placeholder, 
                  value: this.props.currentFilter, onChange: this.applyFilter, 
                  disabled: this.props.disabled})
  }
}

class CollapseButton extends React.Component{
  constructor(props){
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event){
    this.props.onCheck(this.refs.collapsedBuilds.checked);
  }
  render() {
    return (
      React.createElement("span", {className: "semi-muted waterfall-form-item"}, 
        React.createElement("span", {id: "collapsed-prompt"}, "Show collapsed view"), 
        React.createElement("input", {
          className: "checkbox waterfall-checkbox", 
          type: "checkbox", 
          checked: this.props.collapsed, 
          ref: "collapsedBuilds", 
          onChange: this.handleChange}
        )
      )
    )
  }
}

// Headers

function Headers ({shortenCommitMessage, versions, onLinkClick, userTz}) {
  var versionList = _.sortBy(_.values(versions), 'revision_order').reverse();
  return (
    React.createElement("div", {className: "row version-header"}, 
      React.createElement("div", {className: "variant-col col-xs-2 version-header-rolled"}), 
      React.createElement("div", {className: "col-xs-10"}, 
        React.createElement("div", {className: "row"}, 
        
          _.map(versionList, function(version){
            if (version.rolled_up) {
              return React.createElement(RolledUpVersionHeader, {key: version.ids[0], version: version, userTz: userTz});
            }
            // Unrolled up version, no popover
            return (
              React.createElement(ActiveVersionHeader, {
                key: version.ids[0], 
                version: version, 
                userTz: userTz, 
                shortenCommitMessage: shortenCommitMessage, 
                onLinkClick: onLinkClick}
              )
            );
          })
        
        )
      )
    )
  )
}


function ActiveVersionHeader({shortenCommitMessage, version, onLinkClick, userTz}) {
  var message = version.messages[0];
  var author = version.authors[0];
  var id_link = "/version/" + version.ids[0];
  var commit = version.revisions[0].substring(0,5);
  var message = version.messages[0]; 
  var formatted_time = getFormattedTime(version.create_times[0], userTz, 'M/D/YY h:mm A' );
  const maxChars = 44 
  var button;
  if (message.length > maxChars) {
    // If we shorten the commit message, only display the first maxChars chars
    if (shortenCommitMessage) {
      message = message.substring(0, maxChars-3) + "...";
    }
    button = (
      React.createElement(HideHeaderButton, {onLinkClick: onLinkClick, shortenCommitMessage: shortenCommitMessage})
    );
  }
 
  return (
      React.createElement("div", {className: "header-col"}, 
        React.createElement("div", {className: "version-header-expanded"}, 
          React.createElement("div", {className: "col-xs-12"}, 
            React.createElement("div", {className: "row"}, 
              React.createElement("a", {className: "githash", href: id_link}, commit), 
              formatted_time
            )
          ), 
          React.createElement("div", {className: "col-xs-12"}, 
            React.createElement("div", {className: "row"}, 
              React.createElement("strong", null, author), " - ", message, 
              button
            )
          )
        )
      )
  )
};

class HideHeaderButton extends React.Component{
  constructor(props){
    super(props);
    this.onLinkClick = this.onLinkClick.bind(this);
  }
  onLinkClick(event){
    this.props.onLinkClick(this.props.shortenCommitMessage);
  }
  render() {
    var textToShow = this.props.shortenCommitMessage ? "more" : "less";
    return (
      React.createElement("span", {onClick: this.onLinkClick}, " ", React.createElement("a", {href: "#"}, textToShow), " ")
    )
  }
}

function RolledUpVersionHeader({version, userTz}){
  var Popover = ReactBootstrap.Popover;
  var OverlayTrigger = ReactBootstrap.OverlayTrigger;
  var Button = ReactBootstrap.Button;
  
  var versionStr = (version.messages.length > 1) ? "versions" : "version";
  var rolledHeader = version.messages.length + " inactive " + versionStr; 
 
  const popovers = (
    React.createElement(Popover, {id: "popover-positioned-bottom", title: ""}, 
      
        version.ids.map(function(id,i) {
          return React.createElement(RolledUpVersionSummary, {version: version, key: id, i: i, userTz: userTz})
        })
      
    )
  );

  return (
    React.createElement("div", {className: "header-col version-header-rolled"}, 
      React.createElement(OverlayTrigger, {trigger: "click", placement: "bottom", overlay: popovers, className: "col-xs-2"}, 
          React.createElement("span", {className: "pointer"}, " ", rolledHeader, " ")
      )
    )
  )
};

function RolledUpVersionSummary ({version, i, userTz}) {
  var formatted_time = getFormattedTime(new Date(version.create_times[i]), userTz, 'M/D/YY h:mm A' );
  var author = version.authors[i];
  var commit =  version.revisions[i].substring(0,10);
  var message = version.messages[i];
    
  return (
    React.createElement("div", {className: "rolled-up-version-summary"}, 
      React.createElement("span", {className: "version-header-time"}, formatted_time), 
      React.createElement("br", null), 
      React.createElement("a", {href: "/version/" + version.ids[i]}, commit), " - ", React.createElement("strong", null, author), 
      React.createElement("br", null), 
      message, 
      React.createElement("br", null)
    )
  )
};

// Grid

// The main class that binds to the root div. This contains all the distros, builds, and tasks
function Grid ({data, project, collapseInfo, buildVariantFilter, taskFilter}) {
  return (
    React.createElement("div", {className: "waterfall-grid"}, 
      
        data.rows.filter(function(row){
          return row.build_variant.display_name.toLowerCase().indexOf(buildVariantFilter.toLowerCase()) != -1;
        })
        .map(function(row){
          return React.createElement(Variant, {row: row, project: project, collapseInfo: collapseInfo, versions: data.versions, taskFilter: taskFilter});
        })
      
    ) 
  )
};

function filterActiveTasks(tasks, activeStatuses){
  return _.filter(tasks, function(task) { 
      return _.contains(activeStatuses, task.status);
    });
}

// The class for each "row" of the waterfall page. Includes the build variant link, as well as the five columns
// of versions.
function Variant({row, versions, project, collapseInfo, taskFilter}) {
      if (collapseInfo.collapsed){
        collapseInfo.noActive = _.every(row.builds, 
          function(build, versionId){
            var t = filterActiveTasks(build.tasks, collapseInfo.activeTaskStatuses);
            return t.length == 0;
          }) 
      }

      return (
      React.createElement("div", {className: "row variant-row"}, 
        React.createElement("div", {className: "col-xs-2 build-variants"}, 
          React.createElement("a", {href: "/build_variant/" + project + "/" + row.build_variant.id}, 
            row.build_variant.display_name
          )
        ), 
        React.createElement("div", {className: "col-xs-10"}, 
          React.createElement("div", {className: "row build-cells"}, 
            
              row.versions.map(function(versionId,i){
                return React.createElement(Build, {key: versionId, 
                              build: row.builds[versionId], 
                              version: versions[versionId], 
                              collapseInfo: collapseInfo, 
                              taskFilter: taskFilter})
              })
            
          )
        )
      )
    )
}


// Each Build class is one group of tasks for an version + build variant intersection
// We case on whether or not a build is active or not, and return either an ActiveBuild or InactiveBuild respectively

function Build({build, collapseInfo, version, taskFilter}){
  // inactive build
  if (version.rolled_up) {
    return React.createElement(InactiveBuild, {className: "build"});
  }
  // collapsed active build
  if (collapseInfo.collapsed) {
    if (collapseInfo.noActive){
      return (
      React.createElement("div", {className: "build"}, 
        React.createElement(CollapsedBuild, {build: build, activeTaskStatuses: collapseInfo.activeTaskStatuses})
      )
      )
    }
    // Can be modified to show combinations of tasks by statuses  
    var activeTasks = filterActiveTasks(build.tasks, collapseInfo.activeTaskStatuses)
    return (
      React.createElement("div", {className: "build"}, 
        React.createElement(CollapsedBuild, {build: build, activeTaskStatuses: collapseInfo.activeTaskStatuses}), 
        React.createElement(ActiveBuild, {tasks: activeTasks})
      )
    )
  } 
  // uncollapsed active build
  return (
    React.createElement("div", {className: "build"}, 
      React.createElement(ActiveBuild, {tasks: build.tasks, taskFilter: taskFilter})
    )
  )
}

// At least one task in the version is not inactive, so we display all build tasks with their appropiate colors signifying their status
function ActiveBuild({tasks, taskFilter}){  

  if (taskFilter != null){
    tasks = _.filter(tasks, function(task){
      return task.display_name.toLowerCase().indexOf(taskFilter.toLowerCase()) != -1;
    });
  }

  return (
    React.createElement("div", {className: "active-build"}, 
      
        tasks.map(function(task){
          return React.createElement(Task, {task: task})
        })
      
    )
  )
}

// All tasks are inactive, so we display the words "inactive build"
function InactiveBuild ({}){
    return (React.createElement("div", {className: "inactive-build"}, " inactive build "))
}

// A Task contains the information for a single task for a build, including the link to its page, and a tooltip
function Task({task}) {
  var status = task.status;
  var tooltipContent = task.display_name + " - " + status;
  var OverlayTrigger = ReactBootstrap.OverlayTrigger;
  var Popover = ReactBootstrap.Popover;
  var Tooltip = ReactBootstrap.Tooltip;
  var tt = React.createElement(Tooltip, {id: "tooltip"}, tooltipContent)
  return (
    React.createElement(OverlayTrigger, {placement: "top", overlay: tt, animation: false}, 
      React.createElement("a", {href: "/task/" + task.id, className: "waterfall-box " + status})
    )
  )
}

// A CollapsedBuild contains a set of PartialProgressBars, which in turn make up a full progress bar
// We iterate over the 5 different main types of task statuses, each of which have a different color association
function CollapsedBuild({build, activeTaskStatuses}){
  var taskStats = build.taskStatusCount;

  var taskTypes = {
    "success"      : taskStats.succeeded, 
    "dispatched"   : taskStats.started, 
    "system-failed": taskStats.timed_out,
    "undispatched" : taskStats.undispatched, 
    "inactive"     : taskStats.inactive,
    "failed"       : taskStats.failed,
  };

  // Remove all task summaries that have 0 tasks
  taskTypes = _.pick(taskTypes, function(count, status){
    return count > 0 && !(_.contains(activeTaskStatuses, status))
  });
  
  return (
    React.createElement("div", {className: "collapsed-build"}, 
      
        _.map(taskTypes, function(count, status) {
          return React.createElement(TaskSummary, {status: status, count: count, build: build});
        }) 
      
    )
  )
}

// A TaskSummary is the class for one rolled up task type
// A CollapsedBuild is comprised of an  array of contiguous TaskSummaries below individual failing tasks 
function TaskSummary({status, count, build}){
  var id_link = "/build/" + build.id;
  var OverlayTrigger = ReactBootstrap.OverlayTrigger;
  var Popover = ReactBootstrap.Popover;
  var Tooltip = ReactBootstrap.Tooltip;
  var tt = React.createElement(Tooltip, {id: "tooltip"}, count, " ", status);
  var classes = "task-summary " + status
  return (
    React.createElement(OverlayTrigger, {placement: "top", overlay: tt, animation: false}, 
      React.createElement("a", {href: id_link, className: classes}, 
        count
      )
    )
  )
}
