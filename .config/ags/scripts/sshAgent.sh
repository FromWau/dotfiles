#!/usr/bin/env bash

is_ssh_agent_running() {
    status=$(systemctl --user status ssh-agent.service)
    status_line=$(echo "$status" | rg -oP '(?<=Active: ).*')
    state=$(echo "$status_line" | awk '{print $1}')

    if [ "$state" == "active" ]; then
        return 0
    else
        return 1
    fi
}

status() {
    output=$(ssh-add -l 2>&1)
    case "$output" in
    "The agent has no identities.")
        # echo "error:no Identities found" >&2
        exit 0
        ;;
    *)
        echo "$output" | awk '{print "ok:"$3}'
        exit 0
        ;;
    esac
}

add_key() {
    expect <<EOF
        spawn ssh-add $HOME/.ssh/$1
        expect {
            "Enter passphrase for*" {
                send "$2\r"
                expect {
                    "Bad passphrase, try again for*" {
                        exit 1
                    }
                    eof
                }
            }
            eof
        }
EOF
}

if ! is_ssh_agent_running; then
    # echo "error:sshAgent is not running" >&2
    exit 0
fi

if [ "$1" == "status" ]; then
    status
elif [ "$1" == "add" ]; then
    if [ -z "$2" ]; then
        echo "error:missing-file" >&2
        exit 1
    fi

    if [ -z "$3" ]; then
        echo "error:missing-passphrase" >&2
        exit 1
    fi

    if add_key "$2" "$3"; then
        # echo "ok:key-added"
        exit 0
    else
        echo "error:invalid-passphrase" >&2
        exit 1
    fi
else
    echo "error:invalid-argument" >&2
    exit 1
fi
