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
import { command, metadata } from 'clime';
import { MnemonicPassPhrase } from 'symbol-hd-wallets';
import { Account } from 'symbol-sdk';

import { AccountCredentialsTable, CreateProfileCommand } from '../../interfaces/create.profile.command';
import { CreateProfileOptions } from '../../interfaces/createProfile.options';
import { ImportType } from '../../models/importType.enum';
import { Profile } from '../../models/profile.model';
import { ProfileCreationBase } from '../../models/profileCreation.types';
import { DefaultResolver } from '../../resolvers/default.resolver';
import { GenerationHashResolver } from '../../resolvers/generationHash.resolver';
import { ImportTypeResolver } from '../../resolvers/importType.resolver';
import { NetworkResolver } from '../../resolvers/network.resolver';
import { NetworkCurrencyResolver } from '../../resolvers/networkCurrency.resolver';
import { PasswordResolver } from '../../resolvers/password.resolver';
import { ProfileNameResolver } from '../../resolvers/profile.resolver';
import { URLResolver } from '../../resolvers/url.resolver';
import { FormatterService } from '../../services/formatter.service';

export class CommandOptions extends CreateProfileOptions {}

@command({
    description: 'Create a new profile',
})
export default class extends CreateProfileCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const networkType = await new NetworkResolver().resolve(options);
        options.url = await new URLResolver().resolve(options);
        const name = await new ProfileNameResolver().resolve(options);
        const password = await new PasswordResolver().resolve(options);
        const isDefault = await new DefaultResolver().resolve(options);

        this.spinner.start();
        const generationHash = await new GenerationHashResolver().resolve(options);
        const networkCurrency = await new NetworkCurrencyResolver().resolve(options);
        this.spinner.stop();

        const importType = await new ImportTypeResolver().resolve(options);

        const baseArguments: ProfileCreationBase = {
            generationHash,
            isDefault,
            name,
            networkCurrency,
            networkType,
            password,
            url: options.url,
        };

        let profile: Profile;

        if (importType === ImportType.PrivateKey) {
            const { privateKey } = Account.generateNewAccount(networkType);
            profile = this.createProfile({ ...baseArguments, privateKey });
        } else {
            const mnemonic = MnemonicPassPhrase.createRandom().plain;
            profile = this.createProfile({ ...baseArguments, mnemonic, pathNumber: 1 });
        }

        console.log(AccountCredentialsTable.createFromProfile(profile, password).toString());
        console.log(FormatterService.success('Stored ' + name + ' profile'));
    }
}
