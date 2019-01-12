import _ from 'lodash';

export default (ctx, validationErrors, view, viewData, errorCode = 422) => {
  const parseFormErrors = (errors) => {
    const parseError = (error) => {
      if (error.type === 'unique violation') {
        return { ...error, message: ctx.t(`validation:${error.instance.constructor.name}.${error.path}.unique`, { error }) };
      }
      return error;
    };

    return _.map(errors, parseError);
  };

  ctx.status = errorCode;
  ctx.render(view, {
    ...viewData,
    errors: parseFormErrors(validationErrors),
  });
};
