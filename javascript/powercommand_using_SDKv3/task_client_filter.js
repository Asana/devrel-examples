const filterDefs = {
  all: {
    key: 'all',
    matchesTask: () => true,
  },
  name: {
    key: 'name',
    value: null,
    matchesTask: function(task) {
      return task.name && task.name.includes(this.value);
    },
  },
  notes: {
    key: 'notes',
    value: null,
    matchesTask: function(task) {
      return task.notes && task.notes.includes(this.value);
    },
  },
  assignee: {
    key: 'assignee',
    value: null,
    matchesTask: function(task) {
      return task.assignee && task.assignee.name.includes(this.value);
    }
  },
  completed: {
    key: 'completed',
    matchesTask: function(task) {
      console.log("matched complete");
      return task.completed == true;
    }
  },
  incomplete: {
    key: 'incomplete',
    matchesTask: function(task) {
      console.log("matched incomplete");
      return task.completed == false;
    }
  },
};

const getFilters = argv => {
  let filters = [];
  if (argv.all) filters.push(filterDefs.all);
  if (argv.name) filters.push({ ...filterDefs.name, value: argv.name });
  if (argv.notes) filters.push({ ...filterDefs.notes, value: argv.notes });
  if (argv.assignee) filters.push({ ...filterDefs.assignee, value: argv.assignee });
  if (argv.completed) filters.push(filterDefs.completed);
  if (argv.incomplete) filters.push(filterDefs.incomplete);
  if (filters.some(filter => filter.key === filterDefs.all.key) && filters.length != 1) {
    throw new Error("Filter 'all' is not compatible with other filters");
  }
  if (filters.length == 0) {
    throw new Error(`Must specify at least one filter from the set: ${Object.keys(filterDefs).join(', ')}`);
  }
  console.log('Selected filters:', filters.map(f => ({ key: f.key, value: f.value })));
  return filters;
};

module.exports = {
  getFilters,
};
