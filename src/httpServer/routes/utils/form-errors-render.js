import _ from 'lodash';

const parseFormErrors = (errors) => {
  const parseError = (error) => {
    if (error.type === 'unique violation') {
      return { field: error.path, message: `Email ${error.value} уже используется` };
    }
    return { field: error.path, message: error.message };
  };

  return _.map(errors, parseError);
};

export default (ctx, validationErrors, view, viewData) => {
  ctx.status = 422;
  ctx.render(view, {
    ...viewData,
    errors: parseFormErrors(validationErrors),
    formData: ctx.request.body,
  });
};
