import _ from 'lodash';

const columnNameTranslate = {
  TaskStatus: {
    name: 'Название статуса задачи',
  },
  User: {
    email: 'Email',
  },
  Task: {
    name: 'Название задачи',
  },
};

const parseFormErrors = (errors) => {
  const parseError = (error) => {
    if (error.type === 'unique violation') {
      return { field: error.path, message: `${columnNameTranslate[error.instance.constructor.name][error.path]}: '${error.value}' уже существует в системе` };
    }
    return { field: error.path, message: error.message };
  };

  return _.map(errors, parseError);
};

export default (ctx, validationErrors, view, viewData, errorCode = 422) => {
  ctx.status = errorCode;
  ctx.render(view, {
    ...viewData,
    errors: parseFormErrors(validationErrors),
    formData: ctx.request.body,
  });
};
