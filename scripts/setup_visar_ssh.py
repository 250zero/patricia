import os
import subprocess
import paramiko

def setup_ssh():
    key_path = os.path.expanduser(r"~/.ssh/id_ed25519_visar")
    pub_path = key_path + ".pub"

    if not os.path.exists(key_path):
        print(f"Generando nueva clave SSH ed25519 en {key_path}...")
        subprocess.run(["ssh-keygen", "-t", "ed25519", "-N", "", "-f", key_path], check=True)

    with open(pub_path, "r", encoding="utf-8") as f:
        pub_key = f.read().strip()

    print(f"Clave publica obtenida: {pub_key}")

    print("Conectando al servidor Visar (159.203.103.8)...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("159.203.103.8", username="root", password="Adalberto123", timeout=15)

    cmd = f'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "{pub_key}" >> ~/.ssh/authorized_keys && sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err:
        print("Error al configurar authorized_keys:", err)
    else:
        print("✅ Clave publica agregada exitosamente a /root/.ssh/authorized_keys")

    client.close()

if __name__ == "__main__":
    setup_ssh()
