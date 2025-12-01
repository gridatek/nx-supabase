import { PromiseExecutor } from '@nx/devkit';
import { StopExecutorSchema } from './schema';

const runExecutor: PromiseExecutor<StopExecutorSchema> = async (options) => {
  console.log('Executor ran for Stop', options);
  return {
    success: true,
  };
};

export default runExecutor;
