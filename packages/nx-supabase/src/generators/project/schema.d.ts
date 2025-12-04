export interface ProjectGeneratorSchema {
  name: string;
  directory?: string;
  environments?: string;
  skipProjectJson?: boolean;
}
