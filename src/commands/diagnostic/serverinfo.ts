/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import chalk from 'chalk';
import {command, metadata} from 'clime';
import {DiagnosticHttp} from 'nem2-sdk';
import {ProfileCommand, ProfileOptions} from '../../profile.command';

@command({
    description: 'Returns the version of the running rest component',
})
export default class extends ProfileCommand {

    constructor() {
        super();
    }

    @metadata
    execute(options: ProfileOptions) {
        this.spinner.start();

        const profile = this.getProfile(options);

        const diagnosticHttp = new DiagnosticHttp(profile.url);

        diagnosticHttp.getServerInfo()
            .subscribe((serverInfo) => {
                this.spinner.stop(true);
                console.log('restVersion: ' + serverInfo.restVersion);
                console.log('sdkVersion: ' + serverInfo.sdkVersion);
            }, (err) => {
                this.spinner.stop(true);
                let text = '';
                text += chalk.red('Error');
                console.log(text, err.response !== undefined ? err.response.text : err);
            });
    }
}