const { validate, or, perform } = require('../../services/validators');

describe('Testing the validators', () => {
  it('Should be valid', async () => {
    const validators = or([
      validate.isTruthy(false),
      validate.isTruthy(true),
      validate.isTruthy(false),
    ]);
    await expect(perform(validators)).resolves.toMatchObject({
      result: true,
    });
  });

  it("Should not be valid, but doesn't throw", async () => {
    const validators = or(
      [validate.isTruthy(false, 'REJECTED'), validate.isTruthy(false, 'FAILED')],
      'TEST MESSAGE',
    );
    await expect(perform(validators, false)).resolves.toMatchObject({
      result: false,
      message: 'TEST MESSAGE',
    });
  });

  it('Should not be valid, and throw an error', async () => {
    const validators = or(
      [validate.isTruthy(false, 'REJECTED'), validate.isTruthy(false, 'FAILED')],
      'TEST MESSAGE',
    );
    await expect(perform(validators)).rejects.toThrow('TEST MESSAGE');
  });

  it('Should not be valid, and throw the last error message', async () => {
    const validators = or([
      validate.isTruthy(false, 'REJECTED'),
      validate.isTruthy(false, 'FAILED'),
    ]);
    await expect(perform(validators)).rejects.toThrow('FAILED');
  });
});
