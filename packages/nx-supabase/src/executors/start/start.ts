import { PromiseExecutor } from '@nx/devkit';
import { StartExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<StartExecutorSchema> = async (options) => {
  console.log('Executor ran for Start', options);
  return {
    success: true,
  };
};

export default runExecutor;
